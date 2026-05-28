from datetime import datetime, timedelta
from uuid import UUID

from loguru import logger

from seatflow.config import settings
from seatflow.core.logging.service_logger import ServiceLogger
from seatflow.db.dependencies import get_async_session_factory
from seatflow.log import configure_logging
from seatflow.db.models.booking import BookingStatus
from seatflow.db.models.payment import PaymentStatus
from seatflow.db.dao.booking import BookingDAO
from seatflow.db.dao.event import EventDAO
from seatflow.db.dao.payment import PaymentDAO
from seatflow.db.dao.user import UserDAO
from seatflow.tasks.celery_app import celery_app

configure_logging()


@celery_app.task(name="seatflow.tasks.tasks.send_booking_confirmation_email")
def send_booking_confirmation_email(
    user_id: str,
    booking_id: str,
    event_id: str,
    event_name: str,
    event_date: str,
    event_venue: str,
    ticket_count: int,
    total_amount: float,
    user_email: str,
) -> dict[str, str]:
    """Send booking confirmation email (mock implementation for learning)."""
    ServiceLogger.log(
        service="EmailService",
        operation="send_booking_confirmation",
        user_id=user_id,
        entity_id=booking_id,
        recipient=user_email,
        event_name=event_name,
        event_id=event_id,
    )

    ServiceLogger.log_business_logic(
        service="EmailService",
        operation="mock_email_content",
        user_id=user_id,
        to=user_email,
        subject=f"Booking Confirmed: {event_name}",
        ticket_count=ticket_count,
        total_amount=total_amount,
        booking_id=booking_id,
    )

    return {"status": "sent", "user_id": user_id, "booking_id": booking_id}


@celery_app.task(name="seatflow.tasks.tasks.cleanup_expired_reservations")
def cleanup_expired_reservations() -> dict[str, int]:
    """Background task to clean up expired reservations and release tickets."""
    ServiceLogger.log(
        service="BackgroundTask",
        operation="cleanup_expired_reservations",
        action="start",
    )

    import asyncio
    import nest_asyncio

    # Allow nested event loops
    nest_asyncio.apply()

    async def _cleanup() -> int:
        # Create a new engine and session for this task to avoid connection conflicts
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

        engine = create_async_engine(
            settings.database_url,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=3600,
        )

        session_maker = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

        try:
            async with session_maker() as session:
                booking_repo = BookingDAO(session)
                ticket_service_module = __import__("seatflow.services.ticket.service", fromlist=["TicketService"])
                TicketService = ticket_service_module.TicketService

                expire_time = datetime.now()
                count = await booking_repo.expire_reservations(expire_time)

                ticket_service = TicketService(session)

                expired_bookings, _ = await booking_repo.get_bookings_before(expire_time)
                for booking in expired_bookings:
                    if booking.status == BookingStatus.expired:
                        tickets = await ticket_service.get_user_reservations(str(booking.user_id))
                        booking_tickets = [t for t in tickets if t.event_id == booking.event_id]
                        if booking_tickets:
                            ticket_ids = [t.id for t in booking_tickets]
                            await ticket_service.release_tickets(ticket_ids)
                            ServiceLogger.log(
                                service="BackgroundTask",
                                operation="release_tickets",
                                user_id=str(booking.user_id),
                                entity_id=str(booking.id),
                                event_id=str(booking.event_id),
                                tickets_released=len(ticket_ids),
                            )

                await session.commit()
                return count
        finally:
            await engine.dispose()

    try:
        count = asyncio.run(_cleanup())
        ServiceLogger.log(
            service="BackgroundTask",
            operation="cleanup_expired_reservations",
            action="completed",
            expired_count=count,
        )
        return {"expired_count": count, "status": "completed"}
    except Exception as e:
        ServiceLogger.log(
            service="BackgroundTask",
            operation="cleanup_expired_reservations",
            action="error",
            error=str(e),
            level="error",
        )
        raise


@celery_app.task(name="seatflow.tasks.tasks.cleanup_failed_payments")
def cleanup_failed_payments() -> dict[str, int]:
    """Background task to clean up failed/abandoned payments and expire associated bookings."""
    ServiceLogger.log(
        service="BackgroundTask",
        operation="cleanup_failed_payments",
        action="start",
    )

    import asyncio
    import nest_asyncio

    # Allow nested event loops
    nest_asyncio.apply()

    async def _cleanup() -> dict[str, int]:
        # Create a new engine and session for this task to avoid connection conflicts
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

        engine = create_async_engine(
            settings.database_url,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=3600,
        )

        session_maker = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

        try:
            async with session_maker() as session:
                payment_repo = PaymentDAO(session)
                booking_repo = BookingDAO(session)
                ticket_service_module = __import__("seatflow.services.ticket.service", fromlist=["TicketService"])
                TicketService = ticket_service_module.TicketService
                cache_module = __import__("seatflow.core.cache", fromlist=["CacheService"])
                CacheService = cache_module.CacheService

                timeout_threshold = datetime.now() - timedelta(minutes=15)
                pending_payments = await payment_repo.get_pending_payments(timeout_threshold)

                cleaned_payments = 0
                expired_bookings = 0

                for payment in pending_payments:
                    payment.status = PaymentStatus.failed
                    payment.failure_reason = "Payment timed out after 15 minutes"
                    cleaned_payments += 1

                    if payment.booking and payment.booking.status == BookingStatus.reserved:
                        booking = payment.booking
                        booking.status = BookingStatus.expired
                        booking.expires_at = None
                        expired_bookings += 1

                        ticket_service = TicketService(session)
                        tickets = await ticket_service.get_user_reservations(str(payment.user_id))
                        booking_tickets = [t for t in tickets if t.event_id == booking.event_id]
                        if booking_tickets:
                            ticket_ids = [t.id for t in booking_tickets]
                            await ticket_service.release_tickets(ticket_ids)

                            if CacheService:
                                cache = CacheService()
                                await cache.invalidate_event(booking.event_id)

                        ServiceLogger.log(
                            service="BackgroundTask",
                            operation="cleanup_payment_timeout",
                            user_id=str(payment.user_id),
                            payment_id=str(payment.id),
                            booking_id=str(booking.id),
                        )

                await session.commit()
                return {"cleaned_payments": cleaned_payments, "expired_bookings": expired_bookings}
        finally:
            await engine.dispose()

    try:
        result = asyncio.run(_cleanup())
        ServiceLogger.log(
            service="BackgroundTask",
            operation="cleanup_failed_payments",
            action="completed",
            cleaned_payments=result["cleaned_payments"],
            expired_bookings=result["expired_bookings"],
        )
        return {**result, "status": "completed"}
    except Exception as e:
        ServiceLogger.log(
            service="BackgroundTask",
            operation="cleanup_failed_payments",
            action="error",
            error=str(e),
            level="error",
        )
        raise


def trigger_confirmation_email(
    user_id: UUID,
    booking_id: UUID,
    event_id: UUID,
    user_email: str,
    delay_seconds: int = 5,
) -> None:
    """Trigger async booking confirmation email task."""
    import asyncio

    async def _get_event_details() -> tuple[str, str, str]:
        async with get_async_session_factory()() as session:
            event_repo = EventDAO(session)
            event = await event_repo.get_by_id(event_id)
            if not event:
                raise ValueError("Event not found")
            return (
                event.title,
                event.event_date.isoformat() if event.event_date else "",
                event.venue,
            )

    try:
        event_name, event_date, event_venue = asyncio.run(_get_event_details())

        booking_repo_query = __import__("seatflow.db.dao.booking", fromlist=["BookingDAO"])
        BookingDAO = booking_repo_query.BookingDAO

        async def _get_booking_details() -> tuple[int, float]:
            async with get_async_session_factory()() as session:
                booking_repo = BookingDAO(session)
                booking = await booking_repo.get_by_id(booking_id)
                if not booking:
                    raise ValueError("Booking not found")
                return booking.ticket_count, float(booking.total_amount)

        ticket_count, total_amount = asyncio.run(_get_booking_details())

        send_booking_confirmation_email.apply_async(
            args=[
                str(user_id),
                str(booking_id),
                str(event_id),
                event_name,
                event_date,
                event_venue,
                ticket_count,
                total_amount,
                user_email,
            ],
            countdown=delay_seconds,
        )

        ServiceLogger.log(
            service="BackgroundTask",
            operation="schedule_confirmation_email",
            entity_id=str(booking_id),
        )
    except Exception as e:
        ServiceLogger.log(
            service="BackgroundTask",
            operation="schedule_confirmation_email",
            entity_id=str(booking_id),
            error=str(e),
            level="error",
        )
