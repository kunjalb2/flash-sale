import logging
from uuid import UUID

from loguru import logger

from seatflow.config import settings
from seatflow.db.dependencies import get_async_session_factory
from seatflow.events.consumer import EventHandler
from seatflow.events.models import (
    DomainEvent,
    PaymentCompleted,
    PaymentFailed,
    ReservationCancelled,
    ReservationCreated,
    ReservationExpired,
    TicketConfirmed,
)

logger = logging.getLogger(__name__)


class ReservationCreatedHandler(EventHandler):
    """Handler for reservation.created events."""

    async def handle(self, event: DomainEvent) -> None:
        """Handle reservation creation events."""
        if not isinstance(event, ReservationCreated):
            return

        logger.info(
            "Reservation created event received",
            extra={
                "reservation_id": str(event.aggregate_id),
                "user_id": str(event.user_id),
                "event_id": event.data["event_id"],
            },
        )

        factory = get_async_session_factory()
        async with factory() as session:
            try:
                from seatflow.core.cache import CacheService
                from seatflow.db.dao.user import UserDAO

                user_dao = UserDAO(session)
                user = await user_dao.get_by_id(event.user_id)
                if not user:
                    logger.warning(f"User not found: {event.user_id}")
                    return

                cache = CacheService()
                if cache:
                    await cache.invalidate_event(UUID(event.data["event_id"]))

                logger.info(
                    f"Processed reservation.created event for reservation {event.aggregate_id}"
                )
            except Exception as e:
                logger.error(f"Failed to process reservation.created event: {e}", exc_info=True)


class TicketConfirmedHandler(EventHandler):
    """Handler for ticket.confirmed events."""

    async def handle(self, event: DomainEvent) -> None:
        """Handle ticket confirmation events."""
        if not isinstance(event, TicketConfirmed):
            return

        logger.info(
            "Ticket confirmed event received",
            extra={
                "booking_id": str(event.aggregate_id),
                "user_id": str(event.user_id),
                "event_id": event.data["event_id"],
                "ticket_count": event.data["ticket_count"],
            },
        )

        factory = get_async_session_factory()
        async with factory() as session:
            try:
                from seatflow.core.cache import CacheService
                from seatflow.db.dao.event import EventDAO
                from seatflow.db.dao.user import UserDAO

                user_dao = UserDAO(session)
                event_dao = EventDAO(session)

                user = await user_dao.get_by_id(event.user_id)
                event_obj = await event_dao.get_by_id(UUID(event.data["event_id"]))

                cache = CacheService()
                if cache:
                    await cache.invalidate_event(UUID(event.data["event_id"]))
                    await cache.invalidate_user_bookings(event.user_id)

                logger.info(f"Processed ticket.confirmed event for booking {event.aggregate_id}")
            except Exception as e:
                logger.error(f"Failed to process ticket.confirmed event: {e}", exc_info=True)


class PaymentCompletedHandler(EventHandler):
    """Handler for payment.completed events."""

    async def handle(self, event: DomainEvent) -> None:
        """Handle payment completion events."""
        if not isinstance(event, PaymentCompleted):
            return

        logger.info(
            "Payment completed event received",
            extra={
                "payment_id": str(event.aggregate_id),
                "user_id": str(event.user_id),
                "booking_id": event.data["booking_id"],
                "amount": event.data["amount"],
            },
        )

        factory = get_async_session_factory()
        async with factory() as session:
            try:
                from seatflow.core.cache import CacheService
                from seatflow.db.dao.user import UserDAO

                user_dao = UserDAO(session)
                user = await user_dao.get_by_id(event.user_id)
                if not user:
                    logger.warning(f"User not found: {event.user_id}")
                    return

                cache = CacheService()
                if cache:
                    await cache.invalidate_user_payments(event.user_id)

                logger.info(f"Processed payment.completed event for payment {event.aggregate_id}")
            except Exception as e:
                logger.error(f"Failed to process payment.completed event: {e}", exc_info=True)


class ReservationExpiredHandler(EventHandler):
    """Handler for reservation.expired events."""

    async def handle(self, event: DomainEvent) -> None:
        """Handle reservation expiry events."""
        if not isinstance(event, ReservationExpired):
            return

        logger.info(
            "Reservation expired event received",
            extra={
                "reservation_id": str(event.aggregate_id),
                "user_id": str(event.user_id),
                "event_id": event.data["event_id"],
                "ticket_count": event.data["ticket_count"],
                "reason": event.data["reason"],
            },
        )

        factory = get_async_session_factory()
        async with factory() as session:
            try:
                from seatflow.core.cache import CacheService
                from seatflow.db.dao.event import EventDAO
                from seatflow.db.dao.user import UserDAO

                user_dao = UserDAO(session)
                event_dao = EventDAO(session)

                user = await user_dao.get_by_id(event.user_id)
                event_obj = await event_dao.get_by_id(UUID(event.data["event_id"]))

                cache = CacheService()
                if cache:
                    await cache.invalidate_event(UUID(event.data["event_id"]))
                    await cache.invalidate_user_bookings(event.user_id)

                logger.info(
                    f"Processed reservation.expired event for reservation {event.aggregate_id}"
                )
            except Exception as e:
                logger.error(f"Failed to process reservation.expired event: {e}", exc_info=True)


class ReservationCancelledHandler(EventHandler):
    """Handler for reservation.cancelled events."""

    async def handle(self, event: DomainEvent) -> None:
        """Handle reservation cancellation events."""
        if not isinstance(event, ReservationCancelled):
            return

        logger.info(
            "Reservation cancelled event received",
            extra={
                "reservation_id": str(event.aggregate_id),
                "user_id": str(event.user_id),
                "event_id": event.data["event_id"],
                "ticket_count": event.data["ticket_count"],
            },
        )

        factory = get_async_session_factory()
        async with factory() as session:
            try:
                from seatflow.core.cache import CacheService
                from seatflow.db.dao.event import EventDAO

                event_dao = EventDAO(session)

                cache = CacheService()
                if cache:
                    await cache.invalidate_event(UUID(event.data["event_id"]))
                    await cache.invalidate_user_bookings(event.user_id)

                logger.info(
                    f"Processed reservation.cancelled event for reservation {event.aggregate_id}"
                )
            except Exception as e:
                logger.error(f"Failed to process reservation.cancelled event: {e}", exc_info=True)


class PaymentFailedHandler(EventHandler):
    """Handler for payment.failed events."""

    async def handle(self, event: DomainEvent) -> None:
        """Handle payment failure events."""
        if not isinstance(event, PaymentFailed):
            return

        logger.info(
            "Payment failed event received",
            extra={
                "payment_id": str(event.aggregate_id),
                "user_id": str(event.user_id),
                "booking_id": event.data["booking_id"],
                "amount": event.data["amount"],
                "failure_reason": event.data["failure_reason"],
            },
        )

        factory = get_async_session_factory()
        async with factory() as session:
            try:
                from seatflow.core.cache import CacheService
                from seatflow.db.dao.user import UserDAO

                user_dao = UserDAO(session)
                user = await user_dao.get_by_id(event.user_id)
                if not user:
                    logger.warning(f"User not found: {event.user_id}")
                    return

                cache = CacheService()
                if cache:
                    await cache.invalidate_user_payments(event.user_id)

                logger.info(f"Processed payment.failed event for payment {event.aggregate_id}")
            except Exception as e:
                logger.error(f"Failed to process payment.failed event: {e}", exc_info=True)