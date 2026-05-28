from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.web.api.deps import get_current_superuser
from seatflow.core.logging.service_logger import ServiceLogger
from seatflow.db.dependencies import get_db_session
from seatflow.services.redis.dependency import get_redis_client
from seatflow.core.cache import CacheService
from seatflow.web.api.events.schema import (
    EventCreate,
    EventFilter,
    EventListResponse,
    EventResponse,
    EventUpdate,
    PaginationParams,
)
from seatflow.web.api.events.schema import TicketFilter, TicketListResponse
from seatflow.services.event.service import EventService
from seatflow.services.ticket.service import TicketService

router = APIRouter(tags=["Events"])


@router.get(
    "",
    response_model=EventListResponse,
    summary="List all events",
)
async def list_events(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    redis: Annotated[object, Depends(get_redis_client)] = None,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    venue: str | None = Query(None, description="Filter by venue"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    min_price: float | None = Query(None, ge=0, description="Minimum price per ticket"),
    max_price: float | None = Query(None, ge=0, description="Maximum price per ticket"),
    date_from: str | None = Query(None, description="Filter events from this date (ISO format)"),
    date_to: str | None = Query(None, description="Filter events until this date (ISO format)"),
    search: str | None = Query(None, description="Search in title, description, venue"),
) -> EventListResponse:
    """List all events with pagination and optional filtering."""
    import time
    start_time = time.time()
    cache = CacheService(redis)

    ServiceLogger.log_service_operation(
        service_name="EventService",
        operation="list_events",
        details={
            "page": page,
            "size": size,
            "venue_filter": venue,
            "is_active_filter": is_active,
            "min_price": min_price,
            "max_price": max_price,
            "date_from": date_from,
            "date_to": date_to,
            "search": search,
            "request_timestamp": datetime.utcnow().isoformat(),
        },
    )

    try:
        filters = EventFilter(
            venue=venue,
            is_active=is_active,
            min_price=min_price,
            max_price=max_price,
            date_from=datetime.fromisoformat(date_from) if date_from else None,
            date_to=datetime.fromisoformat(date_to) if date_to else None,
            search=search,
        )

        pagination = PaginationParams(page=page, size=size)

        event_service = EventService(session, cache)
        events = await event_service.list_events(pagination, filters)

        ServiceLogger.log_service_operation(
            service_name="EventService",
            operation="list_events",
            success=True,
            details={
                "page": page,
                "size": size,
                "total_items": events.total,
                "returned_items": len(events.items),
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return events
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="EventService",
            operation="list_events",
            success=False,
            error=str(e),
        )
        raise


@router.get(
    "/{event_id}",
    response_model=EventResponse,
    summary="Get event details",
)
async def get_event(
    request: Request,
    event_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    redis: Annotated[object, Depends(get_redis_client)] = None,
) -> EventResponse:
    """Get detailed information about a specific event."""
    import time
    start_time = time.time()
    cache = CacheService(redis)

    ServiceLogger.log_service_operation(
        service_name="EventService",
        operation="get_event",
        entity_id=str(event_id),
        details={
            "event_id": str(event_id),
            "request_timestamp": datetime.utcnow().isoformat(),
        },
    )

    try:
        event_service = EventService(session, cache)
        event = await event_service.get_event(event_id)

        ServiceLogger.log_service_operation(
            service_name="EventService",
            operation="get_event",
            entity_id=str(event.id),
            success=True,
            details={
                "event_id": str(event.id),
                "title": event.title,
                "is_active": event.is_active,
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return event
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="EventService",
            operation="get_event",
            entity_id=str(event_id),
            success=False,
            error=str(e),
        )
        raise


@router.post(
    "",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new event",
    dependencies=[Depends(get_current_superuser)],
)
async def create_event(
    request: Request,
    event_data: EventCreate,
    session: AsyncSession = Depends(get_db_session),
    redis: Annotated[object, Depends(get_redis_client)] = None,
) -> EventResponse:
    """Create a new event (admin only)."""
    import time
    start_time = time.time()
    cache = CacheService(redis)

    ServiceLogger.log_service_operation(
        service_name="EventService",
        operation="create_event",
        details={
            "title": event_data.title,
            "venue": event_data.venue,
            "max_tickets": event_data.max_tickets,
            "price_per_ticket": event_data.price_per_ticket,
            "created_by": "admin",  # This would be from JWT token in real implementation
            "request_timestamp": event_data.created_at.isoformat() if event_data.created_at else None,
        },
    )

    try:
        event_service = EventService(session, cache)
        event = await event_service.create_event(event_data)

        ServiceLogger.log_service_operation(
            service_name="EventService",
            operation="create_event",
            entity_id=str(event.id),
            success=True,
            details={
                "event_id": str(event.id),
                "title": event.title,
                "venue": event.venue,
                "max_tickets": event.max_tickets,
                "price_per_ticket": float(event.price_per_ticket),
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return event
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="EventService",
            operation="create_event",
            success=False,
            error=str(e),
        )
        raise


@router.patch(
    "/{event_id}",
    response_model=EventResponse,
    summary="Update an event",
    dependencies=[Depends(get_current_superuser)],
)
async def update_event(
    request: Request,
    event_id: UUID,
    update_data: EventUpdate,
    session: AsyncSession = Depends(get_db_session),
    redis: Annotated[object, Depends(get_redis_client)] = None,
) -> EventResponse:
    """Update an existing event (admin only)."""
    import time
    start_time = time.time()
    cache = CacheService(redis)

    ServiceLogger.log_service_operation(
        service_name="EventService",
        operation="update_event",
        entity_id=str(event_id),
        details={
            "event_id": str(event_id),
            "update_fields": list(update_data.model_fields_set) if update_data else [],
            "updated_by": "admin",
            "request_timestamp": datetime.utcnow().isoformat(),
        },
    )

    try:
        event_service = EventService(session, cache)
        event = await event_service.update_event(event_id, update_data)

        ServiceLogger.log_service_operation(
            service_name="EventService",
            operation="update_event",
            entity_id=str(event.id),
            success=True,
            details={
                "event_id": str(event.id),
                "updated_fields": list(update_data.model_fields_set) if update_data else [],
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return event
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="EventService",
            operation="update_event",
            entity_id=str(event_id),
            success=False,
            error=str(e),
        )
        raise


@router.delete(
    "/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an event",
    dependencies=[Depends(get_current_superuser)],
)
async def delete_event(
    request: Request,
    event_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    redis: Annotated[object, Depends(get_redis_client)] = None,
) -> None:
    """Delete an event (admin only). Can only delete events with no bookings."""
    import time
    start_time = time.time()
    cache = CacheService(redis)

    ServiceLogger.log_service_operation(
        service_name="EventService",
        operation="delete_event",
        entity_id=str(event_id),
        details={
            "event_id": str(event_id),
            "deleted_by": "admin",
            "request_timestamp": datetime.utcnow().isoformat(),
        },
    )

    try:
        event_service = EventService(session, cache)
        await event_service.delete_event(event_id)

        ServiceLogger.log_service_operation(
            service_name="EventService",
            operation="delete_event",
            entity_id=str(event_id),
            success=True,
            details={
                "event_id": str(event_id),
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="EventService",
            operation="delete_event",
            entity_id=str(event_id),
            success=False,
            error=str(e),
        )
        raise


@router.get(
    "/{event_id}/tickets",
    response_model=TicketListResponse,
    summary="Get tickets for an event",
    description="Get tickets for a specific event with optional filtering by status",
)
async def get_event_tickets(
    request: Request,
    event_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    status: str | None = Query(None, description="Filter by status (available, reserved, sold)"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(100, ge=1, le=500, description="Items per page"),
) -> TicketListResponse:
    """Get tickets for an event with optional filtering."""
    import time
    start_time = time.time()

    ServiceLogger.log_service_operation(
        service_name="TicketService",
        operation="get_event_tickets",
        entity_id=str(event_id),
        details={
            "event_id": str(event_id),
            "status_filter": status,
            "page": page,
            "size": size,
            "request_timestamp": datetime.utcnow().isoformat(),
        },
    )

    try:
        ticket_service = TicketService(session)

        filters = None
        if status:
            filters = TicketFilter(status=status)

        ticket_responses, total, pages = await ticket_service.get_event_tickets(
            event_id=event_id,
            page=page,
            size=size,
            filters=filters,
        )

        ServiceLogger.log_service_operation(
            service_name="TicketService",
            operation="get_event_tickets",
            entity_id=str(event_id),
            success=True,
            details={
                "event_id": str(event_id),
                "total_tickets": total,
                "returned_tickets": len(ticket_responses),
                "status_filter": status,
                "page": page,
                "size": size,
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return TicketListResponse(
            items=ticket_responses,
            total=total,
            page=page,
            size=size,
            pages=pages,
        )
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="TicketService",
            operation="get_event_tickets",
            entity_id=str(event_id),
            success=False,
            error=str(e),
        )
        raise
