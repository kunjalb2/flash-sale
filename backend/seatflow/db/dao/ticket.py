from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import Depends
from sqlalchemy import Select, and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.db.dependencies import get_db_session
from seatflow.db.models.ticket import SeatType, Ticket, TicketStatus


class TicketDAO:
    """Class for accessing ticket table."""

    def __init__(self, session: AsyncSession = Depends(get_db_session)) -> None:
        self.session = session

    async def create(self, ticket_data: dict[str, Any]) -> Ticket:
        ticket = Ticket(**ticket_data)
        self.session.add(ticket)
        await self.session.flush()
        await self.session.refresh(ticket)
        return ticket

    async def create_batch(self, tickets_data: list[dict[str, Any]]) -> list[Ticket]:
        tickets = [Ticket(**data) for data in tickets_data]
        self.session.add_all(tickets)
        await self.session.flush()
        for ticket in tickets:
            await self.session.refresh(ticket)
        return tickets

    async def get_by_id(self, ticket_id: UUID) -> Ticket | None:
        stmt = select(Ticket).where(Ticket.id == ticket_id)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def get_event_tickets(
        self,
        event_id: UUID,
        status: TicketStatus | None = None,
        seat_type: SeatType | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> tuple[list[Ticket], int]:
        query = select(Ticket).where(Ticket.event_id == event_id)
        if status:
            query = query.where(Ticket.status == status)
        if seat_type:
            query = query.where(Ticket.seat_type == seat_type)
        query = query.order_by(Ticket.seat_number)

        total = (await self.session.execute(select(func.count()).select_from(query.subquery()))).scalar()
        result = await self.session.execute(query.offset(offset).limit(limit))
        return list(result.scalars().all()), total

    async def get_available_tickets_count(self, event_id: UUID) -> int:
        stmt = select(func.count()).where(and_(Ticket.event_id == event_id, Ticket.status == TicketStatus.available))
        return (await self.session.execute(stmt)).scalar()

    async def reserve_tickets(
        self, event_id: UUID, quantity: int = 1, seat_type: SeatType | None = None, user_id: str | None = None,
    ) -> list[Ticket]:
        stmt = select(Ticket).where(and_(Ticket.event_id == event_id, Ticket.status == TicketStatus.available)).with_for_update()
        if seat_type:
            stmt = stmt.where(Ticket.seat_type == seat_type)
        stmt = stmt.limit(quantity)
        tickets = list((await self.session.execute(stmt)).scalars().all())

        if len(tickets) < quantity:
            raise ValueError(f"Not enough tickets available. Requested: {quantity}, Available: {len(tickets)}")

        now = datetime.now()
        for ticket in tickets:
            ticket.status = TicketStatus.reserved
            ticket.reserved_at = now
            if user_id:
                ticket.reserved_by = user_id
        await self.session.flush()
        return tickets

    async def release_tickets(self, ticket_ids: list[UUID]) -> None:
        stmt = select(Ticket).where(and_(Ticket.id.in_(ticket_ids), Ticket.status == TicketStatus.reserved)).with_for_update()
        for ticket in (await self.session.execute(stmt)).scalars().all():
            ticket.status = TicketStatus.available
            ticket.reserved_at = None
            ticket.reserved_by = None
        await self.session.flush()

    async def confirm_tickets(self, ticket_ids: list[UUID]) -> list[Ticket]:
        stmt = select(Ticket).where(and_(Ticket.id.in_(ticket_ids), Ticket.status == TicketStatus.reserved)).with_for_update()
        tickets = list((await self.session.execute(stmt)).scalars().all())
        now = datetime.now()
        for ticket in tickets:
            ticket.status = TicketStatus.sold
            ticket.sold_at = now
        await self.session.flush()
        return tickets

    async def expire_reservations(self, event_id: UUID, before_time: datetime) -> int:
        stmt = select(Ticket).where(and_(Ticket.event_id == event_id, Ticket.status == TicketStatus.reserved, Ticket.reserved_at < before_time)).with_for_update()
        tickets = list((await self.session.execute(stmt)).scalars().all())
        for ticket in tickets:
            ticket.status = TicketStatus.available
            ticket.reserved_at = None
            ticket.reserved_by = None
        await self.session.flush()
        return len(tickets)

    async def get_user_reservations(self, user_id: str, event_id: UUID | None = None) -> list[Ticket]:
        stmt = select(Ticket).where(and_(Ticket.reserved_by == user_id, Ticket.status == TicketStatus.reserved))
        if event_id:
            stmt = stmt.where(Ticket.event_id == event_id)
        return list((await self.session.execute(stmt)).scalars().all())

    async def delete(self, ticket: Ticket) -> None:
        await self.session.delete(ticket)
