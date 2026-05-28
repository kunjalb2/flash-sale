from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# --- User Admin Schemas ---


class AdminUserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    is_active: bool
    is_superuser: bool
    booking_count: int = 0
    total_spent: float = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AdminUserListResponse(BaseModel):
    items: list[AdminUserResponse]
    total: int
    page: int
    size: int
    pages: int


class AdminUserCreateResponse(AdminUserResponse):
    generated_password: str | None = None


class AdminUserCreate(BaseModel):
    email: str = Field(..., min_length=1, max_length=255, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    full_name: str = Field(..., min_length=1, max_length=255)
    password: str | None = Field(None, min_length=8, max_length=100)
    is_superuser: bool = False


class AdminUserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=255)
    is_active: bool | None = None
    is_superuser: bool | None = None


class AdminUserDetailResponse(AdminUserResponse):
    recent_bookings: list[dict] | None = None
    recent_payments: list[dict] | None = None


# --- Booking Admin Schemas ---


class AdminBookingResponse(BaseModel):
    id: UUID
    user_id: UUID
    event_id: UUID
    ticket_count: int
    total_amount: float
    status: str
    reserved_at: datetime
    expires_at: datetime | None
    created_at: datetime
    updated_at: datetime
    user_email: str | None = None
    event_title: str | None = None
    payment_status: str | None = None

    model_config = {"from_attributes": True}


class AdminBookingListResponse(BaseModel):
    items: list[AdminBookingResponse]
    total: int
    page: int
    size: int
    pages: int


class AdminBookingDetailResponse(AdminBookingResponse):
    user_info: dict | None = None
    event_info: dict | None = None
    payment_info: dict | None = None


# --- Payment Admin Schemas ---


class AdminPaymentResponse(BaseModel):
    id: UUID
    booking_id: UUID
    user_id: UUID
    amount: float
    currency: str
    status: str
    payment_method: str
    stripe_receipt_url: str | None = None
    paid_at: datetime | None = None
    refunded_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    user_email: str | None = None
    event_title: str | None = None

    model_config = {"from_attributes": True}


class AdminPaymentListResponse(BaseModel):
    items: list[AdminPaymentResponse]
    total: int
    page: int
    size: int
    pages: int


# --- Dashboard Schemas ---


class DashboardStats(BaseModel):
    total_users: int
    total_events: int
    total_bookings: int
    total_revenue: float
    active_events: int
    confirmed_bookings: int
    pending_bookings: int
    cancelled_bookings: int
    recent_bookings_count: int
    recent_users_count: int


class RevenueDataPoint(BaseModel):
    date: str
    revenue: float
    booking_count: int


class RevenueResponse(BaseModel):
    period: str
    data: list[RevenueDataPoint]
    total: float


class EventPerformance(BaseModel):
    event_id: UUID
    title: str
    venue: str
    event_date: datetime
    total_tickets: int
    sold_tickets: int
    available_tickets: int
    revenue: float
    booking_count: int


class EventPerformanceResponse(BaseModel):
    items: list[EventPerformance]


class RecentActivityItem(BaseModel):
    id: UUID
    type: str
    description: str
    amount: float | None = None
    created_at: datetime


class RecentActivityResponse(BaseModel):
    items: list[RecentActivityItem]
    total: int


# --- Ticket Batch Schemas ---


class TicketBatchItem(BaseModel):
    seat_number: str = Field(..., min_length=1, max_length=50)
    section: str | None = Field(None, max_length=100)
    row: str | None = Field(None, max_length=20)
    price: float | None = Field(None, gt=0)
    seat_type: str | None = "general"
    notes: str | None = None


class TicketBatchCreate(BaseModel):
    tickets: list[TicketBatchItem] = Field(..., min_length=1, max_length=500)
    default_price: float | None = Field(None, gt=0)
    default_seat_type: str | None = "general"


class TicketUpdate(BaseModel):
    price: float | None = Field(None, gt=0)
    section: str | None = Field(None, max_length=100)
    notes: str | None = None
