from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

from redis.asyncio import Redis as AsyncRedis
from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.config import settings
from seatflow.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
    ReservationException,
)
from seatflow.db.models.event import Event
from seatflow.db.models.ticket import SeatType, Ticket, TicketStatus
from seatflow.db.dao.event import EventDAO
from seatflow.db.dao.ticket import TicketDAO
from seatflow.web.api.events.schema import TicketAvailability, TicketCreate, TicketFilter, TicketResponse


class TicketService:
    """Service for ticket operations."""

    def __init__(self, session: AsyncSession, redis_client: AsyncRedis | None = None) -> None:
        self.session = session
        self.ticket_repo = TicketDAO(session)
        self.event_repo = EventDAO(session)

    async def create_ticket(self, ticket_data: TicketCreate) -> Ticket:
        """Create a single ticket for an event."""
        event = await self.event_repo.get_by_id(ticket_data.event_id)
        if not event:
            raise NotFoundException(detail="Event not found")

        ticket_dict = ticket_data.model_dump()
        ticket_dict["seat_type"] = SeatType(ticket_dict.get("seat_type", "general"))
        ticket_dict["status"] = TicketStatus.available

        ticket = await self.ticket_repo.create(ticket_dict)
        return ticket

    async def create_event_tickets(
        self,
        event_id: UUID,
        total_tickets: int,
        price: float,
        seat_type: SeatType = SeatType.general,
    ) -> list[Ticket]:
        """Create multiple tickets for an event."""
        event = await self.event_repo.get_by_id(event_id)
        if not event:
            raise NotFoundException(detail="Event not found")

        tickets_data = []
        for i in range(total_tickets):
            tickets_data.append(
                {
                    "event_id": event_id,
                    "seat_number": str(i + 1),
                    "seat_type": seat_type,
                    "price": price,
                    "status": TicketStatus.available,
                }
            )

        tickets = await self.ticket_repo.create_batch(tickets_data)
        return tickets

    async def get_ticket(self, ticket_id: UUID) -> Ticket:
        """Get ticket by ID."""
        ticket = await self.ticket_repo.get_by_id(ticket_id)
        if not ticket:
            raise NotFoundException(detail="Ticket not found")
        return ticket

    async def get_event_tickets(
        self,
        event_id: UUID,
        page: int = 1,
        size: int = 20,
        filters: TicketFilter | None = None,
    ) -> tuple[list[TicketResponse], int, int]:
        """Get tickets for an event with pagination."""
        offset = (page - 1) * size

        status = None
        if filters and filters.status:
            try:
                status = TicketStatus(filters.status)
            except ValueError:
                pass

        seat_type = None
        if filters and filters.seat_type:
            try:
                seat_type = SeatType(filters.seat_type)
            except ValueError:
                pass

        tickets, total = await self.ticket_repo.get_event_tickets(
            event_id=event_id,
            status=status,
            seat_type=seat_type,
            offset=offset,
            limit=size,
        )

        pages = (total + size - 1) // size if total > 0 else 0

        ticket_responses = [TicketResponse.model_validate(ticket) for ticket in tickets]
        return ticket_responses, total, pages

    async def get_ticket_availability(self, event_id: UUID) -> TicketAvailability:
        """Get ticket availability for an event."""
        event = await self.event_repo.get_by_id(event_id)
        if not event:
            raise NotFoundException(detail="Event not found")

        available_count = await self.ticket_repo.get_available_tickets_count(event_id)

        tickets, _ = await self.ticket_repo.get_event_tickets(event_id=event_id, limit=1000000)
        reserved_count = sum(1 for t in tickets if t.status == TicketStatus.reserved)
        sold_count = sum(1 for t in tickets if t.status == TicketStatus.sold)

        return TicketAvailability(
            total_tickets=event.total_tickets,
            available_tickets=available_count,
            reserved_tickets=reserved_count,
            sold_tickets=sold_count,
        )

    async def reserve_tickets(
        self,
        event_id: UUID,
        quantity: int,
        user_id: str | None = None,
        seat_type: SeatType | None = None,
    ) -> list[Ticket]:
        """
        Reserve tickets for an event.
        Uses PostgreSQL row-level locking (SELECT FOR UPDATE) for concurrency safety.
        Redis distributed lock is handled at the BookingService layer.
        """
        event = await self.event_repo.get_by_id(event_id)
        if not event:
            raise NotFoundException(detail="Event not found")

        if not event.is_active:
            raise BadRequestException(detail="Event is not active")

        if quantity > settings.max_tickets_per_user:
            raise BadRequestException(
                detail=f"Cannot reserve more than {settings.max_tickets_per_user} tickets"
            )

        try:
            tickets = await self.ticket_repo.reserve_tickets(
                event_id=event_id,
                quantity=quantity,
                seat_type=seat_type,
                user_id=user_id,
            )
            return tickets
        except ValueError as e:
            raise ConflictException(detail=str(e))

    async def release_tickets(self, ticket_ids: list[UUID]) -> None:
        """Release reserved tickets back to the pool."""
        await self.ticket_repo.release_tickets(ticket_ids)

    async def confirm_tickets(self, ticket_ids: list[UUID]) -> list[Ticket]:
        """Confirm reserved tickets as sold."""
        tickets = await self.ticket_repo.confirm_tickets(ticket_ids)
        return tickets

    async def expire_old_reservations(self, event_id: UUID | None = None) -> int:
        """Expire old reservations for an event or all events."""
        expire_time = datetime.now()

        if event_id:
            count = await self.ticket_repo.expire_reservations(event_id, expire_time)
        else:
            tickets, _ = await self.ticket_repo.get_event_tickets(
                event_id=UUID("00000000-0000-0000-0000-000000000000"),
                limit=1000000,
            )
            count = await self.ticket_repo.expire_reservations(
                event_id or UUID("00000000-0000-0000-0000-000000000000"), expire_time
            )

        return count

    async def get_user_reservations(self, user_id: str) -> list[Ticket]:
        """Get all reservations for a user."""
        tickets = await self.ticket_repo.get_user_reservations(user_id)
        return tickets

    async def delete_ticket(self, ticket_id: UUID) -> None:
        """Delete a ticket (admin only)."""
        ticket = await self.get_ticket(ticket_id)
        if ticket.status in [TicketStatus.reserved, TicketStatus.sold]:
            raise BadRequestException(detail="Cannot delete reserved or sold tickets")
        await self.ticket_repo.delete(ticket)
