from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# --- Event Schemas ---


class EventBase(BaseModel):
    """Base event schema with common fields."""

    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)
    venue: str = Field(..., min_length=1, max_length=255)
    event_date: datetime
    sale_start_date: datetime
    sale_end_date: datetime
    total_tickets: int = Field(..., gt=0)
    price_per_ticket: float = Field(..., gt=0)
    image_url: str | None = Field(None, max_length=500)


class EventCreate(EventBase):
    """Schema for event creation."""

    pass


class EventUpdate(BaseModel):
    """Schema for event update."""

    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)
    venue: str | None = Field(None, min_length=1, max_length=255)
    event_date: datetime | None = None
    sale_start_date: datetime | None = None
    sale_end_date: datetime | None = None
    total_tickets: int | None = Field(None, gt=0)
    price_per_ticket: float | None = Field(None, gt=0)
    image_url: str | None = Field(None, max_length=500)
    is_active: bool | None = None


class EventResponse(EventBase):
    """Schema for event response."""

    id: UUID
    available_tickets: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EventListResponse(BaseModel):
    """Schema for paginated event list response."""

    items: list[EventResponse]
    total: int
    page: int
    size: int
    pages: int


class EventFilter(BaseModel):
    """Schema for event filtering."""

    venue: str | None = None
    is_active: bool | None = None
    min_price: float | None = Field(None, ge=0)
    max_price: float | None = Field(None, ge=0)
    date_from: datetime | None = None
    date_to: datetime | None = None
    search: str | None = Field(None, min_length=1, max_length=100)

    @field_validator("max_price")
    @classmethod
    def validate_price_range(cls, v: float | None, info) -> float | None:
        if v is not None and "min_price" in info.data and info.data["min_price"] is not None:
            if v < info.data["min_price"]:
                raise ValueError("max_price must be greater than min_price")
        return v


class PaginationParams(BaseModel):
    """Schema for pagination parameters."""

    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=100)


# --- Ticket Schemas ---


class TicketBase(BaseModel):
    """Base ticket schema with common fields."""

    seat_number: str = Field(..., min_length=1, max_length=50)
    section: str | None = Field(None, max_length=100)
    row: str | None = Field(None, max_length=20)
    price: float = Field(..., gt=0)


class TicketCreate(TicketBase):
    """Schema for ticket creation."""

    event_id: UUID
    seat_type: str = "general"
    notes: str | None = None


class TicketResponse(TicketBase):
    """Schema for ticket response."""

    id: UUID
    event_id: UUID
    seat_type: str
    status: str
    reserved_at: datetime | None
    reserved_by: str | None
    sold_at: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TicketListResponse(BaseModel):
    """Schema for paginated ticket list response."""

    items: list[TicketResponse]
    total: int
    page: int
    size: int
    pages: int


class TicketAvailability(BaseModel):
    """Schema for ticket availability information."""

    total_tickets: int
    available_tickets: int
    reserved_tickets: int
    sold_tickets: int


class TicketFilter(BaseModel):
    """Schema for ticket filtering."""

    status: str | None = None
    seat_type: str | None = None
