from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.web.api.deps import get_current_superuser
from seatflow.core.logging.service_logger import ServiceLogger
from seatflow.db.dependencies import get_db_session
from seatflow.db.models.booking import BookingStatus
from seatflow.db.models.payment import PaymentStatus
from seatflow.db.models.user import User
from seatflow.web.api.admin.schema import (
    AdminBookingDetailResponse,
    AdminBookingListResponse,
    AdminPaymentListResponse,
    AdminPaymentResponse,
    AdminUserCreate,
    AdminUserCreateResponse,
    AdminUserDetailResponse,
    AdminUserListResponse,
    AdminUserResponse,
    AdminUserUpdate,
    DashboardStats,
    EventPerformanceResponse,
    RecentActivityResponse,
    RevenueResponse,
    TicketBatchCreate,
    TicketUpdate,
)
from seatflow.services.admin.service import AdminService

router = APIRouter(tags=["Admin"])


# --- Users ---


@router.post(
    "/users", response_model=AdminUserCreateResponse, status_code=201, summary="Create user (admin)"
)
async def create_user(
    user_data: AdminUserCreate,
    session: AsyncSession = Depends(get_db_session),
    _admin: Annotated[User, Depends(get_current_superuser)] = None,
) -> AdminUserResponse:
    admin_service = AdminService(session)
    return await admin_service.create_user(user_data)


@router.get("/users", response_model=AdminUserListResponse, summary="List all users (admin)")
async def list_users(
    session: AsyncSession = Depends(get_db_session),
    _admin: Annotated[User, Depends(get_current_superuser)] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, description="Search in email, full_name"),
    is_active: bool | None = Query(None),
    is_superuser: bool | None = Query(None),
) -> AdminUserListResponse:
    admin_service = AdminService(session)
    return await admin_service.list_users(page, size, search, is_active, is_superuser)


@router.get(
    "/users/{user_id}", response_model=AdminUserDetailResponse, summary="Get user detail (admin)"
)
async def get_user_detail(
    user_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    _admin: Annotated[User, Depends(get_current_superuser)] = None,
) -> AdminUserDetailResponse:
    admin_service = AdminService(session)
    return await admin_service.get_user_detail(user_id)


@router.patch("/users/{user_id}", response_model=AdminUserResponse, summary="Update user (admin)")
async def update_user(
    user_id: UUID,
    update_data: AdminUserUpdate,
    session: AsyncSession = Depends(get_db_session),
    _admin: Annotated[User, Depends(get_current_superuser)] = None,
) -> AdminUserResponse:
    admin_service = AdminService(session)
    return await admin_service.update_user(user_id, update_data)


@router.delete("/users/{user_id}", status_code=204, summary="Soft delete user (admin)")
async def delete_user(
    user_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    _admin: Annotated[User, Depends(get_current_superuser)] = None,
) -> None:
    admin_service = AdminService(session)
    await admin_service.soft_delete_user(user_id)


# --- Bookings ---


@router.get(
    "/bookings", response_model=AdminBookingListResponse, summary="List all bookings (admin)"
)
async def list_bookings(
    session: AsyncSession = Depends(get_db_session),
    _admin: Annotated[User, Depends(get_current_superuser)] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None, description="Filter by status"),
    event_id: UUID | None = Query(None),
    user_id: UUID | None = Query(None),
    date_from: str | None = Query(None, description="ISO date"),
    date_to: str | None = Query(None, description="ISO date"),
) -> AdminBookingListResponse:
    admin_service = AdminService(session)
    booking_status = BookingStatus(status) if status else None
    return await admin_service.list_bookings(
        page,
        size,
        booking_status,
        event_id,
        user_id,
        datetime.fromisoformat(date_from) if date_from else None,
        datetime.fromisoformat(date_to) if date_to else None,
    )


@router.get(
    "/bookings/{booking_id}",
    response_model=AdminBookingDetailResponse,
    summary="Get booking detail (admin)",
)
async def get_booking_detail(
    booking_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    _admin: Annotated[User, Depends(get_current_superuser)] = None,
) -> AdminBookingDetailResponse:
    admin_service = AdminService(session)
    return await admin_service.get_booking_detail(booking_id)


@router.post("/bookings/{booking_id}/cancel", status_code=200, summary="Cancel booking (admin)")
async def cancel_booking(
    request: Request,
    booking_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    _admin: Annotated[User, Depends(get_current_superuser)] = None,
) -> dict:
    import time
    start_time = time.time()

    ServiceLogger.log_service_operation(
        service_name="AdminService",
        operation="cancel_booking",
        user_id=str(_admin.id),
        entity_id=str(booking_id),
        details={
            "booking_id": str(booking_id),
            "admin_id": str(_admin.id),
            "admin_email": _admin.email,
            "request_timestamp": datetime.utcnow().isoformat(),
        },
    )

    try:
        admin_service = AdminService(session)
        await admin_service.cancel_booking(booking_id)

        ServiceLogger.log_service_operation(
            service_name="AdminService",
            operation="cancel_booking",
            user_id=str(_admin.id),
            entity_id=str(booking_id),
            success=True,
            details={
                "booking_id": str(booking_id),
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return {"message": "Booking cancelled successfully"}
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="AdminService",
            operation="cancel_booking",
            user_id=str(_admin.id),
            entity_id=str(booking_id),
            success=False,
            error=str(e),
        )
        raise


@router.post("/bookings/{booking_id}/refund", status_code=200, summary="Refund booking (admin)")
async def refund_booking(
    request: Request,
    booking_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    _admin: Annotated[User, Depends(get_current_superuser)] = None,
) -> dict:
    import time
    start_time = time.time()

    ServiceLogger.log_service_operation(
        service_name="AdminService",
        operation="refund_booking",
        user_id=str(_admin.id),
        entity_id=str(booking_id),
        details={
            "booking_id": str(booking_id),
            "admin_id": str(_admin.id),
            "admin_email": _admin.email,
            "request_timestamp": datetime.utcnow().isoformat(),
        },
    )

    try:
        admin_service = AdminService(session)
        await admin_service.refund_booking(booking_id)

        ServiceLogger.log_service_operation(
            service_name="AdminService",
            operation="refund_booking",
            user_id=str(_admin.id),
            entity_id=str(booking_id),
            success=True,
            details={
                "booking_id": str(booking_id),
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return {"message": "Refund initiated successfully"}
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="AdminService",
            operation="refund_booking",
            user_id=str(_admin.id),
            entity_id=str(booking_id),
            success=False,
            error=str(e),
        )
        raise


# --- Payments ---


@router.get(
    "/payments", response_model=AdminPaymentListResponse, summary="List all payments (admin)"
)
async def list_payments(
    session: AsyncSession = Depends(get_db_session),
    _admin: Annotated[User, Depends(get_current_superuser)] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None, description="Filter by status"),
    payment_method: str | None = Query(None),
    date_from: str | None = Query(None, description="ISO date"),
    date_to: str | None = Query(None, description="ISO date"),
) -> AdminPaymentListResponse:
    admin_service = AdminService(session)
    payment_status = PaymentStatus(status) if status else None
    return await admin_service.list_payments(
        page,
        size,
        payment_status,
        payment_method,
        datetime.fromisoformat(date_from) if date_from else None,
        datetime.fromisoformat(date_to) if date_to else None,
    )


@router.get(
    "/payments/{payment_id}",
    response_model=AdminPaymentResponse,
    summary="Get payment detail (admin)",
)
async def get_payment_detail(
    payment_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    _admin: Annotated[User, Depends(get_current_superuser)] = None,
) -> AdminPaymentResponse:
    admin_service = AdminService(session)
    return await admin_service.get_payment_detail(payment_id)


# --- Dashboard ---


@router.get("/dashboard/stats", response_model=DashboardStats, summary="Dashboard stats")
async def get_dashboard_stats(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    _admin: Annotated[User, Depends(get_current_superuser)] = None,
) -> DashboardStats:
    import time
    start_time = time.time()

    ServiceLogger.log_service_operation(
        service_name="AdminService",
        operation="get_dashboard_stats",
        user_id=str(_admin.id),
        details={
            "admin_id": str(_admin.id),
            "admin_email": _admin.email,
            "request_timestamp": datetime.utcnow().isoformat(),
        },
    )

    try:
        admin_service = AdminService(session)
        stats = await admin_service.get_dashboard_stats()

        ServiceLogger.log_service_operation(
            service_name="AdminService",
            operation="get_dashboard_stats",
            user_id=str(_admin.id),
            success=True,
            details={
                "total_users": stats.total_users,
                "total_events": stats.total_events,
                "total_bookings": stats.total_bookings,
                "total_revenue": float(stats.total_revenue) if stats.total_revenue else 0,
                "duration_ms": round((time.time() - start_time) * 1000, 2),
            },
        )

        return stats
    except Exception as e:
        ServiceLogger.log_service_operation(
            service_name="AdminService",
            operation="get_dashboard_stats",
            user_id=str(_admin.id),
            success=False,
            error=str(e),
        )
        raise


@router.get("/dashboard/revenue", response_model=RevenueResponse, summary="Revenue data")
async def get_revenue(
    session: AsyncSession = Depends(get_db_session),
    _admin: Annotated[User, Depends(get_current_superuser)] = None,
    period: str = Query("daily", description="daily, weekly, or monthly"),
    start_date: str | None = Query(None, description="ISO date"),
    end_date: str | None = Query(None, description="ISO date"),
) -> RevenueResponse:
    admin_service = AdminService(session)
    return await admin_service.get_revenue(
        period,
        datetime.fromisoformat(start_date) if start_date else None,
        datetime.fromisoformat(end_date) if end_date else None,
    )


@router.get(
    "/dashboard/events-performance", response_model=EventPerformanceResponse, summary="Top events"
)
async def get_events_performance(
    session: AsyncSession = Depends(get_db_session),
    _admin: Annotated[User, Depends(get_current_superuser)] = None,
    limit: int = Query(10, ge=1, le=50),
) -> EventPerformanceResponse:
    admin_service = AdminService(session)
    return await admin_service.get_events_performance(limit)


@router.get(
    "/dashboard/recent-activity", response_model=RecentActivityResponse, summary="Recent activity"
)
async def get_recent_activity(
    session: AsyncSession = Depends(get_db_session),
    _admin: Annotated[User, Depends(get_current_superuser)] = None,
    limit: int = Query(20, ge=1, le=100),
) -> RecentActivityResponse:
    admin_service = AdminService(session)
    return await admin_service.get_recent_activity(limit)


# --- Tickets ---


@router.post(
    "/events/{event_id}/tickets/batch", status_code=201, summary="Batch create tickets (admin)"
)
async def batch_create_tickets(
    event_id: UUID,
    batch_data: TicketBatchCreate,
    session: AsyncSession = Depends(get_db_session),
    _admin: Annotated[User, Depends(get_current_superuser)] = None,
) -> dict:
    admin_service = AdminService(session)
    return await admin_service.batch_create_tickets(event_id, batch_data)


@router.patch("/tickets/{ticket_id}", summary="Update ticket (admin)")
async def update_ticket(
    ticket_id: UUID,
    update_data: TicketUpdate,
    session: AsyncSession = Depends(get_db_session),
    _admin: Annotated[User, Depends(get_current_superuser)] = None,
) -> dict:
    admin_service = AdminService(session)
    return await admin_service.update_ticket(ticket_id, update_data)


@router.delete("/tickets/{ticket_id}", status_code=204, summary="Delete ticket (admin)")
async def delete_ticket(
    ticket_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    _admin: Annotated[User, Depends(get_current_superuser)] = None,
) -> None:
    admin_service = AdminService(session)
    await admin_service.delete_ticket(ticket_id)
