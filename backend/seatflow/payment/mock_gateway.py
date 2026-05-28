import uuid
from decimal import Decimal

from seatflow.config import settings
from seatflow.payment.base import CheckoutSession, PaymentGateway, PaymentIntent, PaymentResult


class MockPaymentGateway(PaymentGateway):
    """Mock payment gateway for sandbox/development without real Stripe credentials."""

    def __init__(self) -> None:
        self._sessions: dict[str, dict] = {}
        self._intents: dict[str, dict] = {}

    async def create_payment_intent(
        self,
        amount: Decimal,
        currency: str = "usd",
        metadata: dict | None = None,
    ) -> PaymentIntent:
        intent_id = f"pi_mock_{uuid.uuid4().hex[:24]}"
        self._intents[intent_id] = {
            "amount": amount,
            "currency": currency,
            "status": "requires_payment_method",
            "metadata": metadata or {},
        }
        return PaymentIntent(
            id=intent_id,
            amount=amount,
            currency=currency,
            status="requires_payment_method",
            client_secret=f"{intent_id}_secret_mock",
            metadata=metadata,
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
        session_id = f"cs_mock_{uuid.uuid4().hex[:24]}"
        intent_id = f"pi_mock_{uuid.uuid4().hex[:24]}"

        self._sessions[session_id] = {
            "booking_id": booking_id,
            "amount": amount,
            "currency": currency,
            "status": "open",
            "metadata": metadata or {},
        }
        self._intents[intent_id] = {
            "amount": amount,
            "currency": currency,
            "status": "succeeded",
            "metadata": metadata or {},
        }

        mock_checkout_url = f"{settings.cors_origins_list[0]}/checkout/mock?session_id={session_id}"

        return CheckoutSession(
            id=session_id,
            checkout_url=mock_checkout_url,
            payment_intent_id=intent_id,
            amount=amount,
            currency=currency,
            status="open",
            metadata=metadata,
        )

    async def confirm_payment(self, payment_intent_id: str) -> PaymentResult:
        intent = self._intents.get(payment_intent_id)
        if not intent:
            return PaymentResult(
                success=False,
                payment_intent_id=payment_intent_id,
                status="not_found",
                error="Payment intent not found",
            )

        intent["status"] = "succeeded"
        return PaymentResult(
            success=True,
            payment_intent_id=payment_intent_id,
            status="succeeded",
            metadata=intent.get("metadata"),
        )

    async def cancel_payment(self, payment_intent_id: str) -> PaymentResult:
        intent = self._intents.get(payment_intent_id)
        if not intent:
            return PaymentResult(
                success=False,
                payment_intent_id=payment_intent_id,
                status="not_found",
                error="Payment intent not found",
            )

        intent["status"] = "canceled"
        return PaymentResult(
            success=True,
            payment_intent_id=payment_intent_id,
            status="canceled",
            metadata=intent.get("metadata"),
        )

    async def retrieve_payment(self, payment_intent_id: str) -> PaymentIntent:
        intent = self._intents.get(payment_intent_id, {})
        return PaymentIntent(
            id=payment_intent_id,
            amount=intent.get("amount", Decimal("0")),
            currency=intent.get("currency", "usd"),
            status=intent.get("status", "unknown"),
            client_secret=f"{payment_intent_id}_secret_mock",
            metadata=intent.get("metadata"),
        )

    async def retrieve_checkout_session(self, session_id: str) -> CheckoutSession:
        session = self._sessions.get(session_id, {})
        return CheckoutSession(
            id=session_id,
            checkout_url="",
            payment_intent_id=None,
            amount=session.get("amount"),
            currency=session.get("currency", "usd"),
            status=session.get("status", "complete"),
            metadata=session.get("metadata"),
        )

    async def handle_webhook(self, payload: bytes, signature: str) -> dict:
        import json

        try:
            data = json.loads(payload)
        except (json.JSONDecodeError, UnicodeDecodeError):
            data = {}

        return {
            "event_type": data.get("type", "mock.event"),
            "event_id": f"evt_mock_{uuid.uuid4().hex[:24]}",
            "data": data.get("data", {}).get("object", {})
            if isinstance(data.get("data"), dict)
            else {},
        }

    @property
    def is_sandbox(self) -> bool:
        return True

    async def refund_payment(self, payment_intent_id: str, amount: Decimal | None = None) -> PaymentResult:
        intent = self._intents.get(payment_intent_id)
        if not intent:
            return PaymentResult(
                success=False,
                payment_intent_id=payment_intent_id,
                status="not_found",
                error="Payment intent not found",
            )

        intent["status"] = "refunded"
        return PaymentResult(
            success=True,
            payment_intent_id=payment_intent_id,
            status="refunded",
            metadata=intent.get("metadata"),
        )

    async def verify_webhook_signature(self, payload: bytes, signature: str) -> dict:
        return {
            "valid": True,
            "event_type": "mock.event",
            "event_id": f"evt_mock_{uuid.uuid4().hex[:24]}",
        }

    @property
    def publishable_key(self) -> str:
        return settings.stripe_publishable_key or "pk_test_mock"
