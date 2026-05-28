from typing import Any
from uuid import UUID

from fastapi import Depends
from sqlalchemy import Select, and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.db.dependencies import get_db_session
from seatflow.db.models.event import Event


class EventDAO:
    """Class for accessing event table."""

    def __init__(self, session: AsyncSession = Depends(get_db_session)) -> None:
        self.session = session

    async def create(self, event_data: dict[str, Any]) -> Event:
        event_data.setdefault("available_tickets", event_data.get("total_tickets", 0))
        event = Event(**event_data)
        self.session.add(event)
        await self.session.flush()
        await self.session.refresh(event)
        return event

    async def get_by_id(self, event_id: UUID) -> Event | None:
        stmt = select(Event).where(Event.id == event_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        offset: int = 0,
        limit: int = 20,
        filters: Any | None = None,
    ) -> tuple[list[Event], int]:
        query = self._build_query(filters)

        count_stmt = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_stmt)).scalar()

        stmt = query.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total

    async def update(self, event: Event, update_data: dict[str, Any]) -> Event:
        for field, value in update_data.items():
            setattr(event, field, value)
        await self.session.flush()
        await self.session.refresh(event)
        return event

    async def delete(self, event: Event) -> None:
        await self.session.delete(event)

    async def decrement_available_tickets(self, event_id: UUID, quantity: int = 1) -> Event | None:
        stmt = select(Event).where(Event.id == event_id).with_for_update()
        event = (await self.session.execute(stmt)).scalar_one_or_none()
        if event and event.available_tickets >= quantity:
            event.available_tickets -= quantity
            await self.session.flush()
            await self.session.refresh(event)
        return event

    async def increment_available_tickets(self, event_id: UUID, quantity: int = 1) -> Event | None:
        stmt = select(Event).where(Event.id == event_id).with_for_update()
        event = (await self.session.execute(stmt)).scalar_one_or_none()
        if event:
            event.available_tickets = min(event.available_tickets + quantity, event.total_tickets)
            await self.session.flush()
            await self.session.refresh(event)
        return event

    def _build_query(self, filters: Any | None) -> Select:
        query = select(Event).order_by(Event.event_date, Event.created_at)
        if filters:
            conditions = []
            if hasattr(filters, "is_active") and filters.is_active is not None:
                conditions.append(Event.is_active == filters.is_active)
            if hasattr(filters, "venue") and filters.venue:
                conditions.append(Event.venue.ilike(f"%{filters.venue}%"))
            if hasattr(filters, "min_price") and filters.min_price is not None:
                conditions.append(Event.price_per_ticket >= filters.min_price)
            if hasattr(filters, "max_price") and filters.max_price is not None:
                conditions.append(Event.price_per_ticket <= filters.max_price)
            if hasattr(filters, "date_from") and filters.date_from is not None:
                conditions.append(Event.event_date >= filters.date_from)
            if hasattr(filters, "date_to") and filters.date_to is not None:
                conditions.append(Event.event_date <= filters.date_to)
            if hasattr(filters, "search") and filters.search:
                term = f"%{filters.search}%"
                conditions.append(or_(Event.title.ilike(term), Event.description.ilike(term), Event.venue.ilike(term)))
            if conditions:
                query = query.where(and_(*conditions))
        return query
