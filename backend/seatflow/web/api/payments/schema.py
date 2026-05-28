from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CheckoutCreate(BaseModel):
    """Schema for creating a checkout session."""

    booking_id: UUID = Field(..., description="Booking ID to create checkout for")
    success_url: str | None = Field(None, description="URL to redirect after successful payment")
    cancel_url: str | None = Field(None, description="URL to redirect after cancelled payment")


class CheckoutResponse(BaseModel):
    """Schema for checkout session response."""

    checkout_session_id: str
    checkout_url: str
    booking_id: UUID

    model_config = {"from_attributes": True}


class PaymentResponse(BaseModel):
    """Schema for payment response."""

    id: UUID
    booking_id: UUID
    user_id: UUID
    amount: float
    currency: str
    status: str
    payment_method: str
    stripe_checkout_session_id: str | None
    stripe_payment_intent_id: str | None
    stripe_receipt_url: str | None
    stripe_invoice_url: str | None
    paid_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WebhookEvent(BaseModel):
    """Schema for webhook event."""

    event_type: str
    event_id: str
    data: dict


class PaymentVerifyRequest(BaseModel):
    """Schema for payment verification request."""

    payment_id: UUID = Field(..., description="Payment ID to verify")


class PaymentVerifyResponse(BaseModel):
    """Schema for payment verification response."""

    verified: bool
    payment: PaymentResponse | None
    message: str
