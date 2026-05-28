from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response, status
from fastapi.responses import StreamingResponse
from redis.asyncio import Redis as AsyncRedis
from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.web.api.deps import get_current_active_user
from seatflow.core.logging.service_logger import ServiceLogger
from seatflow.core.rate_limiter import ReservationRateLimit
from seatflow.db.dependencies import get_db_session
from seatflow.services.redis.dependency import get_redis_client
from seatflow.core.cache import CacheService
from seatflow.db.models.booking import BookingStatus
from seatflow.db.models.user import User
from seatflow.db.dao.booking import BookingDAO
from seatflow.services.ticket_pdf.service import TicketPDFService
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
from seatflow.services.booking.service import BookingService

router = APIRouter(tags=["Reservations"])


@router.post(
    "",
    response_model=ReservationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a ticket reservation",
)
async def create_reservation(
    request: Request,
    reservation_data: ReservationCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: AsyncSession = Depends(get_db_session),
    redis: AsyncRedis = Depends(get_redis_client),
    _: ReservationRateLimit = None,
) -> ReservationResponse:
    """Reserve tickets for an event."""
    import time
    start_time = time.time()
    cache = CacheService(redis)

    ServiceLogger.log_service_operation(
        service_name="BookingService",
        operation="create_reservation",
        user_id=str(current_user.id),
        details={
            "event_id": str(reservation_data.event_id),
            "ticket_count": reservation_data.ticket_count,
        },
    )

    try:
        booking_service = BookingService(session, cache, redis)
        reservation = await booking_service.create_reservation(reservation_data, current_user.id)

        ServiceLogger.log_service_operation(
            service_name="BookingService",
            operation="create_reservation",
            user_id=str(current_user.id),
            entity_id=str(reservation.id),
            success=True,
            details={
                "reservation_id": str(reservation.id),
                "event_id": str(reservation.event_id),
                "ticket_count": reservation.ticket_count,
                "total_amount": reservation.total_amount,
                "status": reservation.status.value if hasattr(reservation.status, 'value') else str(reservation.status),
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return reservation
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="BookingService",
            operation="create_reservation",
            user_id=str(current_user.id),
            success=False,
            error=str(e),
        )
        raise


@router.post(
    "/{reservation_id}/confirm",
    response_model=BookingResponse,
    summary="Confirm a reservation",
)
async def confirm_reservation(
    request: Request,
    reservation_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: AsyncSession = Depends(get_db_session),
    redis: AsyncRedis = Depends(get_redis_client),
) -> BookingResponse:
    """Confirm a reservation (typically after successful payment)."""
    import time
    start_time = time.time()
    cache = CacheService(redis)

    ServiceLogger.log_service_operation(
        service_name="BookingService",
        operation="confirm_reservation",
        user_id=str(current_user.id),
        entity_id=str(reservation_id),
        details={
            "reservation_id": str(reservation_id),
            "confirm_timestamp": datetime.utcnow().isoformat(),
        },
    )

    try:
        booking_service = BookingService(session, cache, redis)
        confirm_data = ReservationConfirm(reservation_id=reservation_id)
        booking = await booking_service.confirm_reservation(confirm_data, current_user.id)

        ServiceLogger.log_service_operation(
            service_name="BookingService",
            operation="confirm_reservation",
            user_id=str(current_user.id),
            entity_id=str(booking.id),
            success=True,
            details={
                "booking_id": str(booking.id),
                "event_id": str(booking.event_id),
                "ticket_count": booking.ticket_count,
                "total_amount": booking.total_amount,
                "status": booking.status.value if hasattr(booking.status, 'value') else str(booking.status),
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return booking
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="BookingService",
            operation="confirm_reservation",
            user_id=str(current_user.id),
            entity_id=str(reservation_id),
            success=False,
            error=str(e),
        )
        raise


@router.post(
    "/{reservation_id}/cancel",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel a reservation",
)
async def cancel_reservation(
    request: Request,
    reservation_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: AsyncSession = Depends(get_db_session),
    redis: AsyncRedis = Depends(get_redis_client),
) -> None:
    """Cancel an active reservation."""
    import time
    start_time = time.time()
    cache = CacheService(redis)

    ServiceLogger.log_service_operation(
        service_name="BookingService",
        operation="cancel_reservation",
        user_id=str(current_user.id),
        entity_id=str(reservation_id),
        details={
            "reservation_id": str(reservation_id),
            "cancel_timestamp": datetime.utcnow().isoformat(),
        },
    )

    try:
        booking_service = BookingService(session, cache, redis)
        cancel_data = ReservationCancel(reservation_id=reservation_id)
        await booking_service.cancel_reservation(cancel_data, current_user.id)

        ServiceLogger.log_service_operation(
            service_name="BookingService",
            operation="cancel_reservation",
            user_id=str(current_user.id),
            entity_id=str(reservation_id),
            success=True,
            details={
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="BookingService",
            operation="cancel_reservation",
            user_id=str(current_user.id),
            entity_id=str(reservation_id),
            success=False,
            error=str(e),
        )
        raise


@router.delete(
    "/{reservation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel and delete a reservation",
)
async def delete_reservation(
    request: Request,
    reservation_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: AsyncSession = Depends(get_db_session),
    redis: AsyncRedis = Depends(get_redis_client),
) -> None:
    """Cancel and delete a reservation. If the reservation is active, it will be cancelled first."""
    import time
    start_time = time.time()
    cache = CacheService(redis)

    ServiceLogger.log_service_operation(
        service_name="BookingService",
        operation="delete_reservation",
        user_id=str(current_user.id),
        entity_id=str(reservation_id),
        details={"reservation_id": str(reservation_id)},
    )

    try:
        booking_service = BookingService(session, cache, redis)

        # Get the booking to check its status
        booking = await booking_service.booking_repo.get_by_id(reservation_id)
        if not booking:
            from seatflow.core.exceptions import NotFoundException
            raise NotFoundException(detail="Reservation not found")

        if booking.user_id != current_user.id:
            from seatflow.core.exceptions import BadRequestException
            raise BadRequestException(detail="You do not have permission to delete this reservation")

        # If the booking is reserved, cancel it first
        if booking.status == BookingStatus.reserved:
            cancel_data = ReservationCancel(reservation_id=reservation_id)
            await booking_service.cancel_reservation(cancel_data, current_user.id)

        # Now delete the booking if it's cancelled or expired
        if booking.status in [BookingStatus.cancelled, BookingStatus.expired]:
            await booking_service.delete_booking(reservation_id, current_user.id)

        ServiceLogger.log_service_operation(
            service_name="BookingService",
            operation="delete_reservation",
            user_id=str(current_user.id),
            entity_id=str(reservation_id),
            success=True,
            details={"duration_ms": round((time.time() - start_time) * 1000, 2)},
        )
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="BookingService",
            operation="delete_reservation",
            user_id=str(current_user.id),
            entity_id=str(reservation_id),
            success=False,
            error=str(e),
        )
        raise


@router.get(
    "/{booking_id}/tickets",
    summary="Download booking tickets as PDF",
)
async def download_tickets(
    booking_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    """Generate and download a PDF containing tickets for the booking."""
    from seatflow.core.exceptions import NotFoundException, BadRequestException

    booking_dao = BookingDAO(session)
    booking = await booking_dao.get_by_id(booking_id)

    if not booking:
        raise NotFoundException(detail="Booking not found")

    if booking.user_id != current_user.id:
        raise BadRequestException(detail="You can only download your own tickets")

    if booking.status != BookingStatus.confirmed:
        raise BadRequestException(
            detail="Tickets are only available for confirmed bookings"
        )

    pdf_service = TicketPDFService()
    pdf_buffer = pdf_service.generate_ticket_pdf(booking, booking.event)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="tickets-{booking_id}.pdf"',
        },
    )


@router.get(
    "/{reservation_id}",
    response_model=ReservationDetailResponse,
    summary="Get reservation details",
)
async def get_reservation(
    request: Request,
    reservation_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: AsyncSession = Depends(get_db_session),
) -> ReservationDetailResponse:
    """Get detailed information about a specific reservation."""
    import time
    start_time = time.time()

    ServiceLogger.log_service_operation(
        service_name="BookingService",
        operation="get_reservation",
        user_id=str(current_user.id),
        entity_id=str(reservation_id),
        details={
            "reservation_id": str(reservation_id),
            "request_timestamp": datetime.utcnow().isoformat(),
        },
    )

    try:
        booking_service = BookingService(session)
        reservation = await booking_service.get_reservation(reservation_id, current_user.id)

        ServiceLogger.log_service_operation(
            service_name="BookingService",
            operation="get_reservation",
            user_id=str(current_user.id),
            entity_id=str(reservation_id),
            success=True,
            details={
                "reservation_id": str(reservation_id),
                "status": reservation.status.value if hasattr(reservation.status, 'value') else str(reservation.status),
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return reservation
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="BookingService",
            operation="get_reservation",
            user_id=str(current_user.id),
            entity_id=str(reservation_id),
            success=False,
            error=str(e),
        )
        raise


@router.get(
    "",
    response_model=BookingListResponse,
    summary="List user bookings",
)
async def list_bookings(
    request: Request,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: AsyncSession = Depends(get_db_session),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: str | None = Query(None, description="Filter by status"),
) -> BookingListResponse:
    """List all bookings for the current user."""
    import time
    start_time = time.time()

    ServiceLogger.log_service_operation(
        service_name="BookingService",
        operation="list_bookings",
        user_id=str(current_user.id),
        details={
            "page": page,
            "size": size,
            "status_filter": status,
            "request_timestamp": datetime.utcnow().isoformat(),
        },
    )

    try:
        booking_status = None
        if status:
            try:
                booking_status = BookingStatus(status)
            except ValueError:
                ServiceLogger.log_service_operation(
                    service_name="BookingService",
                    operation="list_bookings",
                    user_id=str(current_user.id),
                    details={
                        "warning": "Invalid status filter provided",
                        "invalid_status": status,
                    },
                    level="warning",
                )

        booking_service = BookingService(session)
        bookings = await booking_service.get_user_bookings(current_user.id, page, size, booking_status)

        ServiceLogger.log_service_operation(
            service_name="BookingService",
            operation="list_bookings",
            user_id=str(current_user.id),
            success=True,
            details={
                "page": page,
                "size": size,
                "total_items": bookings.total,
                "returned_items": len(bookings.items),
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return bookings
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="BookingService",
            operation="list_bookings",
            user_id=str(current_user.id),
            success=False,
            error=str(e),
        )
        raise


@router.get(
    "/bookings/{booking_id}",
    response_model=BookingWithEventResponse,
    summary="Get booking details",
)
async def get_booking(
    request: Request,
    booking_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: AsyncSession = Depends(get_db_session),
) -> BookingWithEventResponse:
    """Get detailed information about a specific booking."""
    import time
    start_time = time.time()

    ServiceLogger.log_service_operation(
        service_name="BookingService",
        operation="get_booking",
        user_id=str(current_user.id),
        entity_id=str(booking_id),
        details={
            "booking_id": str(booking_id),
            "request_timestamp": datetime.utcnow().isoformat(),
        },
    )

    try:
        booking_service = BookingService(session)
        booking = await booking_service.get_booking_with_event(booking_id, current_user.id)

        ServiceLogger.log_service_operation(
            service_name="BookingService",
            operation="get_booking",
            user_id=str(current_user.id),
            entity_id=str(booking.id),
            success=True,
            details={
                "booking_id": str(booking.id),
                "event_id": str(booking.event.id) if booking.event else None,
                "status": booking.status.value if hasattr(booking.status, 'value') else str(booking.status),
                "ticket_count": booking.ticket_count,
                "total_amount": float(booking.total_amount),
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return booking
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="BookingService",
            operation="get_booking",
            user_id=str(current_user.id),
            entity_id=str(booking_id),
            success=False,
            error=str(e),
        )
        raise
