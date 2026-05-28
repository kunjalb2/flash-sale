from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID


class EventType(str, Enum):
    """Domain event types."""

    RESERVATION_CREATED = "reservation.created"
    PAYMENT_COMPLETED = "payment.completed"
    TICKET_CONFIRMED = "ticket.confirmed"
    RESERVATION_EXPIRED = "reservation.expired"
    RESERVATION_CANCELLED = "reservation.cancelled"
    PAYMENT_FAILED = "payment.failed"


class DomainEvent:
    """Base class for domain events."""

    def __init__(
        self,
        event_type: EventType,
        aggregate_id: UUID,
        aggregate_type: str,
        data: dict[str, Any],
        user_id: UUID | None = None,
        correlation_id: str | None = None,
    ) -> None:
        self.event_type = event_type
        self.aggregate_id = aggregate_id
        self.aggregate_type = aggregate_type
        self.data = data
        self.user_id = user_id
        self.correlation_id = correlation_id
        self.timestamp = datetime.now()
        self.id = f"{event_type.value}:{aggregate_id}:{int(self.timestamp.timestamp())}"

    def to_dict(self) -> dict[str, Any]:
        """Convert event to dictionary."""
        return {
            "id": self.id,
            "event_type": self.event_type.value,
            "aggregate_id": str(self.aggregate_id),
            "aggregate_type": self.aggregate_type,
            "data": self.data,
            "user_id": str(self.user_id) if self.user_id else None,
            "correlation_id": self.correlation_id,
            "timestamp": self.timestamp.isoformat(),
        }


class ReservationCreated(DomainEvent):
    """Event raised when a reservation is created."""

    def __init__(
        self,
        reservation_id: UUID,
        user_id: UUID,
        event_id: UUID,
        ticket_count: int,
        total_amount: float,
        expires_at: datetime,
        correlation_id: str | None = None,
    ) -> None:
        data = {
            "event_id": str(event_id),
            "ticket_count": ticket_count,
            "total_amount": total_amount,
            "expires_at": expires_at.isoformat(),
        }
        super().__init__(
            event_type=EventType.RESERVATION_CREATED,
            aggregate_id=reservation_id,
            aggregate_type="booking",
            data=data,
            user_id=user_id,
            correlation_id=correlation_id,
        )


class PaymentCompleted(DomainEvent):
    """Event raised when a payment is completed successfully."""

    def __init__(
        self,
        payment_id: UUID,
        booking_id: UUID,
        user_id: UUID,
        event_id: UUID,
        amount: float,
        payment_method: str,
        correlation_id: str | None = None,
    ) -> None:
        data = {
            "booking_id": str(booking_id),
            "event_id": str(event_id),
            "amount": amount,
            "payment_method": payment_method,
        }
        super().__init__(
            event_type=EventType.PAYMENT_COMPLETED,
            aggregate_id=payment_id,
            aggregate_type="payment",
            data=data,
            user_id=user_id,
            correlation_id=correlation_id,
        )


class TicketConfirmed(DomainEvent):
    """Event raised when tickets are confirmed."""

    def __init__(
        self,
        booking_id: UUID,
        user_id: UUID,
        event_id: UUID,
        ticket_count: int,
        total_amount: float,
        correlation_id: str | None = None,
    ) -> None:
        data = {
            "event_id": str(event_id),
            "ticket_count": ticket_count,
            "total_amount": total_amount,
        }
        super().__init__(
            event_type=EventType.TICKET_CONFIRMED,
            aggregate_id=booking_id,
            aggregate_type="booking",
            data=data,
            user_id=user_id,
            correlation_id=correlation_id,
        )


class ReservationExpired(DomainEvent):
    """Event raised when a reservation expires."""

    def __init__(
        self,
        reservation_id: UUID,
        user_id: UUID,
        event_id: UUID,
        ticket_count: int,
        reason: str,
        correlation_id: str | None = None,
    ) -> None:
        data = {
            "event_id": str(event_id),
            "ticket_count": ticket_count,
            "reason": reason,
        }
        super().__init__(
            event_type=EventType.RESERVATION_EXPIRED,
            aggregate_id=reservation_id,
            aggregate_type="booking",
            data=data,
            user_id=user_id,
            correlation_id=correlation_id,
        )


class ReservationCancelled(DomainEvent):
    """Event raised when a reservation is cancelled."""

    def __init__(
        self,
        reservation_id: UUID,
        user_id: UUID,
        event_id: UUID,
        ticket_count: int,
        correlation_id: str | None = None,
    ) -> None:
        data = {
            "event_id": str(event_id),
            "ticket_count": ticket_count,
        }
        super().__init__(
            event_type=EventType.RESERVATION_CANCELLED,
            aggregate_id=reservation_id,
            aggregate_type="booking",
            data=data,
            user_id=user_id,
            correlation_id=correlation_id,
        )


class PaymentFailed(DomainEvent):
    """Event raised when a payment fails."""

    def __init__(
        self,
        payment_id: UUID,
        booking_id: UUID,
        user_id: UUID,
        amount: float,
        failure_reason: str,
        correlation_id: str | None = None,
    ) -> None:
        data = {
            "booking_id": str(booking_id),
            "amount": amount,
            "failure_reason": failure_reason,
        }
        super().__init__(
            event_type=EventType.PAYMENT_FAILED,
            aggregate_id=payment_id,
            aggregate_type="payment",
            data=data,
            user_id=user_id,
            correlation_id=correlation_id,
        )
