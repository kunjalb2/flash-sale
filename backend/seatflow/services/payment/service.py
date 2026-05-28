import secrets
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.config import settings
from seatflow.core.cache import CacheService
from seatflow.core.exceptions import BadRequestException, ConflictException, NotFoundException
from seatflow.db.models.booking import Booking, BookingStatus
from seatflow.db.models.payment import Payment, PaymentMethod, PaymentStatus
from seatflow.payment import get_payment_gateway
from seatflow.payment.base import CheckoutSession
from seatflow.db.dao.booking import BookingDAO
from seatflow.db.dao.payment import PaymentDAO
from seatflow.web.api.payments.schema import (
    CheckoutCreate,
    CheckoutResponse,
    PaymentResponse,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
)


class PaymentService:
    """Service for payment operations."""

    def __init__(self, session: AsyncSession, cache: CacheService | None = None) -> None:
        self.session = session
        self.payment_repo = PaymentDAO(session)
        self.booking_repo = BookingDAO(session)
        self.payment_gateway = get_payment_gateway()
        self.cache = cache

    async def create_checkout_session(
        self,
        checkout_data: CheckoutCreate,
        user_id: UUID,
    ) -> CheckoutResponse:
        """Create a Stripe checkout session for a booking."""
        booking = await self.booking_repo.get_by_id(checkout_data.booking_id)
        if not booking:
            raise NotFoundException(detail="Booking not found")

        if booking.user_id != user_id:
            raise BadRequestException(detail="You do not have permission to pay for this booking")

        if booking.status != BookingStatus.reserved:
            raise BadRequestException(detail="Booking is not available for payment")

        # Allow a 30-second grace period for checkout session creation
        # This prevents the booking from expiring while the user is in the checkout flow
        from datetime import timedelta
        grace_period = timedelta(seconds=30)
        current_time = datetime.now(timezone.utc)
        if booking.expires_at and (booking.expires_at + grace_period) < current_time:
            booking.status = BookingStatus.expired
            await self.session.flush()
            raise BadRequestException(detail="Booking has expired")

        existing_payment = await self.payment_repo.get_by_booking_id(booking.id)
        if existing_payment and existing_payment.status in (
            PaymentStatus.succeeded,
            PaymentStatus.processing,
        ):
            raise ConflictException(detail="Payment has already been processed for this booking")

        idempotency_key = secrets.token_urlsafe(32)
        existing_idempotent_payment = await self.payment_repo.get_by_idempotency_key(
            idempotency_key
        )
        if existing_idempotent_payment:
            return CheckoutResponse(
                checkout_session_id=existing_idempotent_payment.stripe_checkout_session_id or "",
                checkout_url="",
                booking_id=booking.id,
            )

        success_url = (
            checkout_data.success_url
            or f"{settings.cors_origins_list[0]}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
        )
        cancel_url = (
            checkout_data.cancel_url
            or f"{settings.cors_origins_list[0]}/checkout/cancel?booking_id={booking.id}"
        )

        metadata = {
            "booking_id": str(booking.id),
            "user_id": str(user_id),
            "event_id": str(booking.event_id),
            "ticket_count": str(booking.ticket_count),
            "email": booking.user.email if hasattr(booking, "user") else "",
        }

        checkout_session = await self.payment_gateway.create_checkout_session(
            amount=Decimal(str(booking.total_amount)),
            booking_id=str(booking.id),
            success_url=success_url,
            cancel_url=cancel_url,
            currency="usd",
            metadata=metadata,
        )

        payment_data = {
            "booking_id": booking.id,
            "user_id": user_id,
            "stripe_checkout_session_id": checkout_session.id,
            "amount": float(booking.total_amount),
            "currency": "usd",
            "status": PaymentStatus.pending,
            "payment_method": PaymentMethod.stripe,
            "payment_metadata": metadata,
            "idempotency_key": idempotency_key,
        }

        payment = await self.payment_repo.create(payment_data)

        return CheckoutResponse(
            checkout_session_id=checkout_session.id,
            checkout_url=checkout_session.checkout_url,
            booking_id=booking.id,
        )

    async def verify_payment(
        self, request: PaymentVerifyRequest, user_id: UUID
    ) -> PaymentVerifyResponse:
        """Verify a payment using Stripe."""
        payment = await self.payment_repo.get_by_id(request.payment_id)
        if not payment:
            raise NotFoundException(detail="Payment not found")

        if payment.user_id != user_id:
            raise BadRequestException(detail="You do not have permission to view this payment")

        if not payment.stripe_payment_intent_id:
            return PaymentVerifyResponse(
                verified=False,
                payment=None,
                message="Payment intent ID not found",
            )

        try:
            stripe_result = await self.payment_gateway.confirm_payment(
                payment.stripe_payment_intent_id
            )

            if stripe_result.success:
                await self._process_successful_payment(payment)
            else:
                await self._process_failed_payment(payment, stripe_result.status)

            await self.session.refresh(payment)

            return PaymentVerifyResponse(
                verified=stripe_result.success,
                payment=PaymentResponse.model_validate(payment),
                message="Payment verified successfully"
                if stripe_result.success
                else f"Payment status: {stripe_result.status}",
            )
        except Exception as e:
            return PaymentVerifyResponse(
                verified=False,
                payment=PaymentResponse.model_validate(payment),
                message=f"Failed to verify payment: {str(e)}",
            )

    async def handle_webhook(self, event_data: dict[str, Any]) -> dict[str, Any]:
        """Handle Stripe webhook events."""
        event_type = event_data.get("event_type")
        data = event_data.get("data", {})

        if event_type == "checkout.session.completed":
            await self._handle_checkout_completed(data)
        elif event_type == "payment_intent.succeeded":
            await self._handle_payment_succeeded(data)
        elif event_type == "payment_intent.payment_failed":
            await self._handle_payment_failed(data)
        elif event_type == "payment_intent.canceled":
            await self._handle_payment_canceled(data)

        return {"status": "processed", "event_type": event_type}

    async def _handle_checkout_completed(self, session_data: dict) -> None:
        """Handle checkout.session.completed webhook event."""
        session_id = session_data.get("id")
        payment = await self.payment_repo.get_by_stripe_session_id(session_id)

        if not payment:
            return

        payment.stripe_payment_intent_id = session_data.get("payment_intent")
        payment.stripe_receipt_url = session_data.get("receipt_url")
        payment.stripe_invoice_url = session_data.get("invoice_pdf")

        payment_status = session_data.get("payment_status", "pending")
        if payment_status == "paid":
            payment.status = PaymentStatus.succeeded
            payment.paid_at = datetime.now(timezone.utc)
            await self._confirm_booking(payment)
        else:
            payment.status = PaymentStatus.pending

        await self.session.flush()

    async def _handle_payment_succeeded(self, payment_intent_data: dict) -> None:
        """Handle payment_intent.succeeded webhook event."""
        payment_intent_id = payment_intent_data.get("id")
        payment = await self.payment_repo.get_by_payment_intent_id(payment_intent_id)

        if not payment:
            return

        await self._process_successful_payment(payment)

    async def _handle_payment_failed(self, payment_intent_data: dict) -> None:
        """Handle payment_intent.payment_failed webhook event."""
        payment_intent_id = payment_intent_data.get("id")
        payment = await self.payment_repo.get_by_payment_intent_id(payment_intent_id)

        if not payment:
            return

        failure_reason = payment_intent_data.get("last_payment_error", {}).get(
            "message", "Payment failed"
        )
        await self._process_failed_payment(payment, "failed", failure_reason)

    async def _handle_payment_canceled(self, payment_intent_data: dict) -> None:
        """Handle payment_intent.canceled webhook event."""
        payment_intent_id = payment_intent_data.get("id")
        payment = await self.payment_repo.get_by_payment_intent_id(payment_intent_id)

        if not payment:
            return

        await self._process_failed_payment(payment, "canceled", "Payment canceled by user")

    async def _process_successful_payment(self, payment: Payment) -> None:
        """Process a successful payment."""
        payment.status = PaymentStatus.succeeded
        payment.paid_at = datetime.now(timezone.utc)
        await self.session.flush()

        from seatflow.events import PaymentCompleted, get_event_publisher
        from seatflow.db.models.event import Event

        event_publisher = await get_event_publisher()
        await event_publisher.publish(
            PaymentCompleted(
                payment_id=payment.id,
                booking_id=payment.booking_id,
                user_id=payment.user_id,
                event_id=payment.booking.event_id
                if payment.booking
                else UUID("00000000-0000-0000-0000-000000000000"),
                amount=float(payment.amount),
                payment_method=payment.payment_method.value,
            )
        )

        await self._confirm_booking(payment)

    async def _process_failed_payment(
        self, payment: Payment, status: str = "failed", reason: str | None = None
    ) -> None:
        """Process a failed payment."""
        payment.status = PaymentStatus.failed if status == "failed" else PaymentStatus.cancelled
        payment.failure_reason = reason
        await self.session.flush()

        from seatflow.events import PaymentFailed, get_event_publisher

        event_publisher = await get_event_publisher()
        await event_publisher.publish(
            PaymentFailed(
                payment_id=payment.id,
                booking_id=payment.booking_id,
                user_id=payment.user_id,
                amount=float(payment.amount),
                failure_reason=reason or "Payment failed",
            )
        )

    async def _confirm_booking(self, payment: Payment) -> None:
        """Confirm the associated booking after successful payment."""
        booking = await self.booking_repo.get_by_id(payment.booking_id)
        if booking and booking.status == BookingStatus.reserved:
            from seatflow.web.api.bookings.schema import ReservationConfirm
            from seatflow.services.booking.service import BookingService

            booking_service = BookingService(self.session, self.cache)
            await booking_service.confirm_reservation(
                ReservationConfirm(reservation_id=booking.id),
                payment.user_id,
            )
