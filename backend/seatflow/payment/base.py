from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal


@dataclass
class PaymentIntent:
    id: str
    amount: Decimal
    currency: str
    status: str
    client_secret: str | None = None
    metadata: dict | None = None


@dataclass
class PaymentResult:
    success: bool
    payment_intent_id: str
    status: str
    error: str | None = None
    metadata: dict | None = None


@dataclass
class CheckoutSession:
    id: str
    checkout_url: str
    payment_intent_id: str | None = None
    amount: Decimal | None = None
    currency: str = "usd"
    status: str = "pending"
    metadata: dict | None = None


class PaymentGateway(ABC):
    @abstractmethod
    async def create_payment_intent(self, amount: Decimal, currency: str = "usd", metadata: dict | None = None) -> PaymentIntent:
        pass

    @abstractmethod
    async def create_checkout_session(self, amount: Decimal, booking_id: str, success_url: str, cancel_url: str, currency: str = "usd", metadata: dict | None = None) -> CheckoutSession:
        pass

    @abstractmethod
    async def confirm_payment(self, payment_intent_id: str) -> PaymentResult:
        pass

    @abstractmethod
    async def refund_payment(self, payment_intent_id: str, amount: Decimal | None = None) -> PaymentResult:
        pass

    @abstractmethod
    async def verify_webhook_signature(self, payload: bytes, signature: str) -> dict:
        pass
