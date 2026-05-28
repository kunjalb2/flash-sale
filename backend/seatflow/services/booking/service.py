from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from redis.asyncio import Redis as AsyncRedis
from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.config import settings
from seatflow.core.cache import CacheService
from seatflow.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
    ReservationException,
)
from seatflow.core.lock import DistributedLockService
from seatflow.events import (
    ReservationCancelled,
    ReservationCreated,
    ReservationExpired,
    TicketConfirmed,
    get_event_publisher,
)
from seatflow.db.models.booking import Booking, BookingStatus
from seatflow.db.models.event import Event
from seatflow.db.models.ticket import Ticket
from seatflow.db.dao.booking import BookingDAO
from seatflow.db.dao.event import EventDAO
from seatflow.db.dao.ticket import TicketDAO
from seatflow.services.ticket.service import TicketService
from seatflow.web.api.bookings.schema import (
    BookingListResponse,
    BookingResponse,
    BookingWithEventResponse,
    ReservationCancel,
    ReservationConfirm,
    ReservationCreate,
    ReservationDetailResponse,
    ReservationResponse,
)


class BookingService:
    """Service for booking and reservation operations."""

    def __init__(
        self,
        session: AsyncSession,
        cache: CacheService | None = None,
        redis_client: AsyncRedis | None = None,
    ) -> None:
        self.session = session
        self.booking_repo = BookingDAO(session)
        self.event_repo = EventDAO(session)
        self.ticket_repo = TicketDAO(session)
        self.cache = cache
        self.redis = redis_client

    async def create_reservation(
        self, reservation_data: ReservationCreate, user_id: UUID
    ) -> ReservationResponse:
        """
        Create a ticket reservation.
        Wraps the entire flow in a Redis distributed lock so no two requests
        can reserve seats for the same event concurrently.
        """
        event = await self.event_repo.get_by_id(reservation_data.event_id)
        if not event:
            raise NotFoundException(detail="Event not found")

        if not event.is_active:
            raise BadRequestException(detail="Event is not active")

        existing_reservation = await self.booking_repo.get_active_reservation(
            user_id=user_id,
            event_id=reservation_data.event_id,
        )
        if existing_reservation:
            raise ConflictException(
                detail="You already have an active reservation for this event. Please complete or cancel it first."
            )

        lock_timeout = settings.reservation_timeout_seconds + 10

        async def _do_reserve() -> ReservationResponse:
            now = datetime.now(timezone.utc)
            expires_at = now + timedelta(seconds=settings.reservation_timeout_seconds)

            try:
                ticket_service = TicketService(self.session, self.redis)

                reserved_tickets = await ticket_service.reserve_tickets(
                    event_id=reservation_data.event_id,
                    quantity=reservation_data.ticket_count,
                    user_id=str(user_id),
                )
            except Exception as e:
                raise ReservationException(detail=f"Failed to reserve tickets: {str(e)}")

            # Atomically decrement available_tickets within the same locked flow
            await self.event_repo.decrement_available_tickets(
                reservation_data.event_id, reservation_data.ticket_count
            )

            total_amount = sum(ticket.price for ticket in reserved_tickets)

            booking_dict = {
                "user_id": user_id,
                "event_id": reservation_data.event_id,
                "ticket_count": reservation_data.ticket_count,
                "total_amount": total_amount,
                "status": BookingStatus.reserved,
                "reserved_at": now,
                "expires_at": expires_at,
            }

            booking = await self.booking_repo.create(booking_dict)

            if self.cache:
                await self.cache.invalidate_event(reservation_data.event_id)

            event_publisher = await get_event_publisher()
            await event_publisher.publish(
                ReservationCreated(
                    reservation_id=booking.id,
                    user_id=user_id,
                    event_id=reservation_data.event_id,
                    ticket_count=reservation_data.ticket_count,
                    total_amount=float(total_amount),
                    expires_at=expires_at,
                )
            )

            return ReservationResponse.model_validate(booking)

        if self.redis:
            lock_service = DistributedLockService(self.redis)
            async with lock_service.event_lock(
                reservation_data.event_id,
                timeout_seconds=lock_timeout,
                wait_seconds=3.0,
            ):
                return await _do_reserve()
        else:
            return await _do_reserve()

    async def get_reservation(
        self, reservation_id: UUID, user_id: UUID
    ) -> ReservationDetailResponse:
        """Get reservation details."""
        booking = await self.booking_repo.get_by_id(reservation_id)
        if not booking:
            raise NotFoundException(detail="Reservation not found")

        if booking.user_id != user_id:
            raise BadRequestException(detail="You do not have permission to view this reservation")

        if booking.expires_at and booking.expires_at < datetime.now(timezone.utc):
            booking.status = BookingStatus.expired
            await self.session.flush()

        ticket_service = TicketService(self.session)
        tickets = await ticket_service.get_user_reservations(str(user_id))
        booking_tickets = [t for t in tickets if t.event_id == booking.event_id]

        ticket_details = [
            {
                "id": str(t.id),
                "seat_number": t.seat_number,
                "section": t.section,
                "row": t.row,
                "seat_type": t.seat_type.value,
                "price": t.price,
            }
            for t in booking_tickets
        ]

        # Create response dict with all required fields
        response_data = {
            "id": booking.id,
            "user_id": booking.user_id,
            "event_id": booking.event_id,
            "ticket_count": booking.ticket_count,
            "total_amount": booking.total_amount,
            "status": booking.status.value if hasattr(booking.status, "value") else str(booking.status),
            "reserved_at": booking.reserved_at,
            "expires_at": booking.expires_at,
            "created_at": booking.created_at,
            "updated_at": booking.updated_at,
            "tickets": ticket_details,
        }

        return ReservationDetailResponse.model_validate(response_data)

    async def confirm_reservation(
        self, confirm_data: ReservationConfirm, user_id: UUID
    ) -> BookingResponse:
        """Confirm a reservation (typically after payment)."""
        booking = await self.booking_repo.get_by_id(confirm_data.reservation_id)
        if not booking:
            raise NotFoundException(detail="Reservation not found")

        if booking.user_id != user_id:
            raise BadRequestException(
                detail="You do not have permission to confirm this reservation"
            )

        if booking.status != BookingStatus.reserved:
            raise BadRequestException(detail="Reservation cannot be confirmed")

        if booking.expires_at and booking.expires_at < datetime.now(timezone.utc):
            booking.status = BookingStatus.expired
            await self.session.flush()
            raise BadRequestException(detail="Reservation has expired")

        ticket_service = TicketService(self.session)

        tickets = await ticket_service.get_user_reservations(str(user_id))
        booking_tickets = [t for t in tickets if t.event_id == booking.event_id]

        ticket_ids = [t.id for t in booking_tickets]
        await ticket_service.confirm_tickets(ticket_ids)

        booking.status = BookingStatus.confirmed
        booking.expires_at = None
        await self.session.flush()

        await self.session.refresh(booking)

        if self.cache:
            await self.cache.invalidate_event(booking.event_id)

        from seatflow.tasks import trigger_confirmation_email

        trigger_confirmation_email(
            user_id=user_id,
            booking_id=booking.id,
            event_id=booking.event_id,
            user_email=booking.user.email if hasattr(booking, "user") else "",
        )

        event_publisher = await get_event_publisher()
        await event_publisher.publish(
            TicketConfirmed(
                booking_id=booking.id,
                user_id=user_id,
                event_id=booking.event_id,
                ticket_count=booking.ticket_count,
                total_amount=float(booking.total_amount),
            )
        )

        return BookingResponse.model_validate(booking)

    async def cancel_reservation(self, cancel_data: ReservationCancel, user_id: UUID) -> None:
        """Cancel a reservation."""
        booking = await self.booking_repo.get_by_id(cancel_data.reservation_id)
        if not booking:
            raise NotFoundException(detail="Reservation not found")

        if booking.user_id != user_id:
            raise BadRequestException(
                detail="You do not have permission to cancel this reservation"
            )

        if booking.status != BookingStatus.reserved:
            raise BadRequestException(detail="Only active reservations can be cancelled")

        ticket_service = TicketService(self.session)

        tickets = await ticket_service.get_user_reservations(str(user_id))
        booking_tickets = [t for t in tickets if t.event_id == booking.event_id]

        ticket_ids = [t.id for t in booking_tickets]
        await ticket_service.release_tickets(ticket_ids)

        # Return tickets to the available pool
        await self.event_repo.increment_available_tickets(
            booking.event_id, len(ticket_ids)
        )

        booking.status = BookingStatus.cancelled
        booking.expires_at = None
        await self.session.flush()

        if self.cache:
            await self.cache.invalidate_event(booking.event_id)

        event_publisher = await get_event_publisher()
        await event_publisher.publish(
            ReservationCancelled(
                reservation_id=booking.id,
                user_id=user_id,
                event_id=booking.event_id,
                ticket_count=booking.ticket_count,
            )
        )

    async def delete_booking(self, booking_id: UUID, user_id: UUID) -> None:
        """Delete a cancelled booking."""
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise NotFoundException(detail="Booking not found")

        if booking.user_id != user_id:
            raise BadRequestException(detail="You do not have permission to delete this booking")

        if booking.status != BookingStatus.cancelled:
            raise BadRequestException(detail="Only cancelled bookings can be deleted")

        # Check if there are any payments associated with this booking
        # Bookings with payments cannot be deleted for audit purposes
        from seatflow.db.dao.payment import PaymentDAO
        payment_repo = PaymentDAO(self.session)
        payment = await payment_repo.get_by_booking_id(booking_id)

        if payment:
            raise BadRequestException(
                detail="Cannot delete booking with payment history. Cancelled bookings with payments are kept for audit purposes."
            )

        await self.booking_repo.delete(booking)

    async def get_user_bookings(
        self,
        user_id: UUID,
        page: int = 1,
        size: int = 20,
        status: BookingStatus | None = None,
    ) -> BookingListResponse:
        """Get all bookings for a user."""
        offset = (page - 1) * size

        bookings, total = await self.booking_repo.get_user_bookings(
            user_id=user_id,
            status=status,
            offset=offset,
            limit=size,
        )

        pages = (total + size - 1) // size if total > 0 else 0

        # Build booking responses with event details
        booking_responses = []
        for booking in bookings:
            event = await self.event_repo.get_by_id(booking.event_id)

            # Manually create the response with event details
            response_data = {
                "id": booking.id,
                "user_id": booking.user_id,
                "event_id": booking.event_id,
                "ticket_count": booking.ticket_count,
                "total_amount": booking.total_amount,
                "status": booking.status.value
                if hasattr(booking.status, "value")
                else str(booking.status),
                "reserved_at": booking.reserved_at,
                "expires_at": booking.expires_at,
                "created_at": booking.created_at,
                "updated_at": booking.updated_at,
                "event": {
                    "id": event.id,
                    "title": event.title,
                    "venue": event.venue,
                    "event_date": event.event_date,
                    "price_per_ticket": event.price_per_ticket,
                    "available_tickets": event.available_tickets,
                    "image_url": event.image_url,
                }
                if event
                else None,
            }
            booking_responses.append(BookingWithEventResponse.model_validate(response_data))

        return BookingListResponse(
            items=booking_responses,
            total=total,
            page=page,
            size=size,
            pages=pages,
        )

    async def expire_reservations(self) -> int:
        """Expire all old reservations (background task)."""
        expire_time = datetime.now(timezone.utc)
        count = await self.booking_repo.expire_reservations(expire_time)

        ticket_service = TicketService(self.session)

        event_publisher = await get_event_publisher()
        expired_bookings, _ = await self.booking_repo.get_bookings_before(expire_time)
        for booking in expired_bookings:
            tickets = await ticket_service.get_user_reservations(str(booking.user_id))
            booking_tickets = [t for t in tickets if t.event_id == booking.event_id]
            if booking_tickets:
                ticket_ids = [t.id for t in booking_tickets]
                await ticket_service.release_tickets(ticket_ids)
                await self.event_repo.increment_available_tickets(
                    booking.event_id, len(ticket_ids)
                )

            await event_publisher.publish(
                ReservationExpired(
                    reservation_id=booking.id,
                    user_id=booking.user_id,
                    event_id=booking.event_id,
                    ticket_count=booking.ticket_count,
                    reason="Reservation expired after timeout",
                )
            )

        if self.cache and expired_bookings:
            event_ids = {booking.event_id for booking in expired_bookings}
            for event_id in event_ids:
                await self.cache.invalidate_event(event_id)

        return count

    async def get_booking(self, booking_id: UUID, user_id: UUID) -> BookingResponse:
        """Get booking details."""
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise NotFoundException(detail="Booking not found")

        if booking.user_id != user_id:
            raise BadRequestException(detail="You do not have permission to view this booking")

        return BookingResponse.model_validate(booking)

    async def get_booking_with_event(
        self, booking_id: UUID, user_id: UUID
    ) -> BookingWithEventResponse:
        """Get booking details with event information."""
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise NotFoundException(detail="Booking not found")

        if booking.user_id != user_id:
            raise BadRequestException(detail="You do not have permission to view this booking")

        return BookingWithEventResponse.model_validate(booking)
