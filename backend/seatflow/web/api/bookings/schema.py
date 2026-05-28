from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ReservationCreate(BaseModel):
    """Schema for creating a reservation."""

    event_id: UUID = Field(..., description="Event ID to reserve tickets for")
    ticket_count: int = Field(..., gt=0, le=10, description="Number of tickets to reserve")
    seat_type: str | None = Field(None, description="Preferred seat type (optional)")

    @field_validator("ticket_count")
    @classmethod
    def validate_ticket_count(cls, v: int, info) -> int:
        if v > 10:
            raise ValueError("Cannot reserve more than 10 tickets at once")
        return v


class ReservationResponse(BaseModel):
    """Schema for reservation response."""

    id: UUID
    user_id: UUID
    event_id: UUID
    ticket_count: int
    total_amount: float
    status: str
    reserved_at: datetime
    expires_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReservationDetailResponse(ReservationResponse):
    """Schema for detailed reservation response including ticket details."""

    tickets: list[dict[str, Any]]


class ReservationConfirm(BaseModel):
    """Schema for confirming a reservation."""

    reservation_id: UUID


class ReservationCancel(BaseModel):
    """Schema for cancelling a reservation."""

    reservation_id: UUID


class BookingResponse(BaseModel):
    """Schema for confirmed booking response."""

    id: UUID
    user_id: UUID
    event_id: UUID
    ticket_count: int
    total_amount: float
    status: str
    reserved_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BookingEventDetail(BaseModel):
    """Event details included in booking response."""

    id: UUID
    title: str
    venue: str
    event_date: datetime
    price_per_ticket: float
    available_tickets: int
    image_url: str | None

    model_config = {"from_attributes": True}


class BookingWithEventResponse(BaseModel):
    """Booking response that includes event details."""

    id: UUID
    user_id: UUID
    event_id: UUID
    ticket_count: int
    total_amount: float
    status: str
    reserved_at: datetime
    expires_at: datetime | None = None
    event: BookingEventDetail | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BookingListResponse(BaseModel):
    """Schema for paginated booking list response."""

    items: list[BookingWithEventResponse]
    total: int
    page: int
    size: int
    pages: int
