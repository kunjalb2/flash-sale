import time
from decimal import Decimal

import stripe

from seatflow.config import settings
from seatflow.payment.base import CheckoutSession, PaymentGateway, PaymentIntent, PaymentResult


class StripeSandboxGateway(PaymentGateway):
    """Stripe sandbox payment gateway for testing."""

    def __init__(
        self,
        secret_key: str = "",
        webhook_secret: str = "",
    ) -> None:
        self.secret_key = secret_key or settings.stripe_secret_key
        self.webhook_secret = webhook_secret or settings.stripe_webhook_secret
        stripe.api_key = self.secret_key

    async def create_payment_intent(
        self,
        amount: Decimal,
        currency: str = "usd",
        metadata: dict | None = None,
    ) -> PaymentIntent:
        intent = await stripe.PaymentIntent.create_async(
            amount=int(amount * 100),
            currency=currency,
            metadata=metadata or {},
            automatic_payment_methods={"enabled": True},
        )
        return PaymentIntent(
            id=intent.id,
            amount=Decimal(intent.amount) / 100,
            currency=intent.currency,
            status=intent.status,
            client_secret=intent.client_secret,
            metadata=intent.metadata,
        )

    async def create_checkout_session(
        self,
        amount: Decimal,
        booking_id: str,
        success_url: str,
        cancel_url: str,
        currency: str = "usd",
        metadata: dict | None = None,
    ) -> CheckoutSession:
        session = await stripe.checkout.Session.create_async(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": currency,
                        "product_data": {
                            "name": "Ticket Booking",
                            "description": f"Booking ID: {booking_id}",
                        },
                        "unit_amount": int(amount * 100),
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata or {},
            expires_at=int(time.time()) + 1800,
            customer_email=metadata.get("email") if metadata else None,
        )
        return CheckoutSession(
            id=session.id,
            checkout_url=session.url,
            payment_intent_id=session.payment_intent,
            amount=Decimal(session.amount_total / 100) if session.amount_total else None,
            currency=session.currency,
            status=session.status,
            metadata=session.metadata,
        )

    async def confirm_payment(self, payment_intent_id: str) -> PaymentResult:
        intent = await stripe.PaymentIntent.retrieve_async(payment_intent_id)
        return PaymentResult(
            success=intent.status in ("succeeded", "processing"),
            payment_intent_id=intent.id,
            status=intent.status,
            metadata=intent.metadata,
        )

    async def cancel_payment(self, payment_intent_id: str) -> PaymentResult:
        intent = await stripe.PaymentIntent.cancel_async(payment_intent_id)
        return PaymentResult(
            success=intent.status == "canceled",
            payment_intent_id=intent.id,
            status=intent.status,
            metadata=intent.metadata,
        )

    async def retrieve_payment(self, payment_intent_id: str) -> PaymentIntent:
        intent = await stripe.PaymentIntent.retrieve_async(payment_intent_id)
        return PaymentIntent(
            id=intent.id,
            amount=Decimal(intent.amount) / 100,
            currency=intent.currency,
            status=intent.status,
            client_secret=intent.client_secret,
            metadata=intent.metadata,
        )

    async def retrieve_checkout_session(self, session_id: str) -> CheckoutSession:
        session = await stripe.checkout.Session.retrieve_async(session_id)
        return CheckoutSession(
            id=session.id,
            checkout_url=session.url,
            payment_intent_id=session.payment_intent,
            amount=Decimal(session.amount_total / 100) if session.amount_total else None,
            currency=session.currency,
            status=session.payment_status,
            metadata=session.metadata,
        )

    async def handle_webhook(self, payload: bytes, signature: str) -> dict:
        event = stripe.Webhook.construct_event(payload, signature, self.webhook_secret)
        return {
            "event_type": event.type,
            "event_id": event.id,
            "data": event.data.object,
        }

    @property
    def is_sandbox(self) -> bool:
        return True

    @property
    def publishable_key(self) -> str:
        return settings.stripe_publishable_key


class StripeProductionGateway(PaymentGateway):
    """Stripe production payment gateway."""

    def __init__(
        self,
        secret_key: str = "",
        webhook_secret: str = "",
    ) -> None:
        self.secret_key = secret_key or settings.stripe_secret_key
        self.webhook_secret = webhook_secret or settings.stripe_webhook_secret
        stripe.api_key = self.secret_key

    async def create_payment_intent(
        self,
        amount: Decimal,
        currency: str = "usd",
        metadata: dict | None = None,
    ) -> PaymentIntent:
        intent = await stripe.PaymentIntent.create_async(
            amount=int(amount * 100),
            currency=currency,
            metadata=metadata or {},
            automatic_payment_methods={"enabled": True},
        )
        return PaymentIntent(
            id=intent.id,
            amount=Decimal(intent.amount) / 100,
            currency=intent.currency,
            status=intent.status,
            client_secret=intent.client_secret,
            metadata=intent.metadata,
        )

    async def create_checkout_session(
        self,
        amount: Decimal,
        booking_id: str,
        success_url: str,
        cancel_url: str,
        currency: str = "usd",
        metadata: dict | None = None,
    ) -> CheckoutSession:
        session = await stripe.checkout.Session.create_async(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": currency,
                        "product_data": {
                            "name": "Ticket Booking",
                            "description": f"Booking ID: {booking_id}",
                        },
                        "unit_amount": int(amount * 100),
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata or {},
            expires_at=int(time.time()) + 1800,
            customer_email=metadata.get("email") if metadata else None,
        )
        return CheckoutSession(
            id=session.id,
            checkout_url=session.url,
            payment_intent_id=session.payment_intent,
            amount=Decimal(session.amount_total / 100) if session.amount_total else None,
            currency=session.currency,
            status=session.payment_status,
            metadata=session.metadata,
        )

    async def confirm_payment(self, payment_intent_id: str) -> PaymentResult:
        intent = await stripe.PaymentIntent.retrieve_async(payment_intent_id)
        return PaymentResult(
            success=intent.status in ("succeeded", "processing"),
            payment_intent_id=intent.id,
            status=intent.status,
            metadata=intent.metadata,
        )

    async def cancel_payment(self, payment_intent_id: str) -> PaymentResult:
        intent = await stripe.PaymentIntent.cancel_async(payment_intent_id)
        return PaymentResult(
            success=intent.status == "canceled",
            payment_intent_id=intent.id,
            status=intent.status,
            metadata=intent.metadata,
        )

    async def retrieve_payment(self, payment_intent_id: str) -> PaymentIntent:
        intent = await stripe.PaymentIntent.retrieve_async(payment_intent_id)
        return PaymentIntent(
            id=intent.id,
            amount=Decimal(intent.amount) / 100,
            currency=intent.currency,
            status=intent.status,
            client_secret=intent.client_secret,
            metadata=intent.metadata,
        )

    async def retrieve_checkout_session(self, session_id: str) -> CheckoutSession:
        session = await stripe.checkout.Session.retrieve_async(session_id)
        return CheckoutSession(
            id=session.id,
            checkout_url=session.url,
            payment_intent_id=session.payment_intent,
            amount=Decimal(session.amount_total / 100) if session.amount_total else None,
            currency=session.currency,
            status=session.payment_status,
            metadata=session.metadata,
        )

    async def handle_webhook(self, payload: bytes, signature: str) -> dict:
        event = stripe.Webhook.construct_event(payload, signature, self.webhook_secret)
        return {
            "event_type": event.type,
            "event_id": event.id,
            "data": event.data.object,
        }

    @property
    def is_sandbox(self) -> bool:
        return False

    @property
    def publishable_key(self) -> str:
        return settings.stripe_publishable_key


def get_payment_gateway() -> PaymentGateway:
    """Factory function to get the appropriate payment gateway based on settings."""
    if settings.payment_mode == "production":
        return StripeProductionGateway()
    if not settings.stripe_secret_key or settings.stripe_secret_key.startswith("sk_test_your"):
        from seatflow.payment.mock_gateway import MockPaymentGateway

        return MockPaymentGateway()
    return StripeSandboxGateway()
