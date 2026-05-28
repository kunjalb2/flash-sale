from math import ceil
from typing import Any
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.core.cache import CacheService
from seatflow.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
    ReservationException,
)
from seatflow.db.models.event import Event
from seatflow.db.dao.event import EventDAO
from seatflow.web.api.events.schema import (
    EventCreate,
    EventFilter,
    EventListResponse,
    EventResponse,
    EventUpdate,
    PaginationParams,
)


class EventService:
    """Service for event operations with caching."""

    def __init__(self, session: AsyncSession, cache: CacheService | None = None) -> None:
        self.session = session
        self.event_repo = EventDAO(session)
        self.cache = cache

    def _event_to_dict(self, event: Event) -> dict[str, Any]:
        """Convert Event model to dict for caching."""
        return {
            "id": str(event.id),
            "title": event.title,
            "description": event.description,
            "venue": event.venue,
            "event_date": event.event_date.isoformat(),
            "sale_start_date": event.sale_start_date.isoformat(),
            "sale_end_date": event.sale_end_date.isoformat(),
            "total_tickets": event.total_tickets,
            "available_tickets": event.available_tickets,
            "price_per_ticket": event.price_per_ticket,
            "image_url": event.image_url,
            "is_active": event.is_active,
            "created_at": event.created_at.isoformat(),
            "updated_at": event.updated_at.isoformat(),
        }

    def _dict_to_event_response(self, data: dict[str, Any]) -> EventResponse:
        """Convert cached dict to EventResponse schema."""
        return EventResponse(**data)

    async def create_event(self, event_data: EventCreate) -> Event:
        """Create a new event."""
        event_dict = event_data.model_dump()
        event = await self.event_repo.create(event_dict)
        if self.cache:
            await self.cache.invalidate_events()
        return event

    async def get_event(self, event_id: UUID) -> Event:
        """Get event by ID with caching."""
        if self.cache:
            cached = await self.cache.get_event(event_id)
            if cached:
                return self._dict_to_event_response(cached)

        event = await self.event_repo.get_by_id(event_id)
        if not event:
            raise NotFoundException(detail="Event not found")

        if self.cache:
            await self.cache.set_event(event_id, self._event_to_dict(event))

        return event

    async def list_events(
        self,
        pagination: PaginationParams,
        filters: EventFilter | None = None,
    ) -> EventListResponse:
        """List events with pagination and optional filtering with caching."""
        if self.cache:
            filter_dict = filters.model_dump(exclude_none=True) if filters else None
            cached = await self.cache.get_events_list(
                page=pagination.page,
                size=pagination.size,
                filters=filter_dict,
            )
            if cached:
                items = [self._dict_to_event_response(item) for item in cached["items"]]
                return EventListResponse(
                    items=items,
                    total=cached["total"],
                    page=cached["page"],
                    size=cached["size"],
                    pages=cached["pages"],
                )

        offset = (pagination.page - 1) * pagination.size
        events, total = await self.event_repo.list(
            offset=offset,
            limit=pagination.size,
            filters=filters,
        )

        pages = ceil(total / pagination.size) if total > 0 else 0

        response = EventListResponse(
            items=events,
            total=total,
            page=pagination.page,
            size=pagination.size,
            pages=pages,
        )

        if self.cache:
            filter_dict = filters.model_dump(exclude_none=True) if filters else None
            await self.cache.set_events_list(
                page=pagination.page,
                size=pagination.size,
                filters=filter_dict,
                data={
                    "items": [self._event_to_dict(e) for e in events],
                    "total": total,
                    "page": pagination.page,
                    "size": pagination.size,
                    "pages": pages,
                },
            )

        return response

    async def update_event(self, event_id: UUID, update_data: EventUpdate) -> Event:
        """Update an existing event with cache invalidation."""
        event = await self.get_event(event_id)

        if update_data.total_tickets is not None:
            booked_tickets = event.total_tickets - event.available_tickets
            if update_data.total_tickets < booked_tickets:
                raise BadRequestException(
                    detail="Cannot reduce total tickets below already booked count"
                )
            new_available = update_data.total_tickets - booked_tickets
            update_dict = update_data.model_dump(exclude_unset=True, exclude={"total_tickets"})
            update_dict["total_tickets"] = update_data.total_tickets
            update_dict["available_tickets"] = new_available
        else:
            update_dict = update_data.model_dump(exclude_unset=True)

        updated_event = await self.event_repo.update(event, update_dict)

        if self.cache:
            await self.cache.invalidate_event(event_id)

        return updated_event

    async def delete_event(self, event_id: UUID) -> None:
        """Delete an event with cache invalidation."""
        event = await self.get_event(event_id)

        booked_tickets = event.total_tickets - event.available_tickets
        if booked_tickets > 0:
            raise BadRequestException(detail="Cannot delete event with existing bookings")

        await self.event_repo.delete(event)

        if self.cache:
            await self.cache.invalidate_event(event_id)

    async def reserve_tickets(self, event_id: UUID, quantity: int = 1) -> Event:
        """Reserve tickets for an event using row-level locking with cache invalidation."""
        event = await self.event_repo.decrement_available_tickets(event_id, quantity)

        if not event:
            raise NotFoundException(detail="Event not found")

        if event.available_tickets < 0:
            raise ConflictException(detail="Not enough tickets available")

        if self.cache:
            await self.cache.invalidate_event(event_id)

        return event

    async def release_tickets(self, event_id: UUID, quantity: int = 1) -> Event:
        """Release reserved tickets back to the pool with cache invalidation."""
        event = await self.event_repo.increment_available_tickets(event_id, quantity)

        if not event:
            raise NotFoundException(detail="Event not found")

        if self.cache:
            await self.cache.invalidate_event(event_id)

        return event
