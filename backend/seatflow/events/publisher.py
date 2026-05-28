from abc import ABC, abstractmethod

from seatflow.events.models import DomainEvent


class EventPublisher(ABC):
    """Abstract base class for event publishers."""

    @abstractmethod
    async def publish(self, event: DomainEvent, routing_key: str | None = None) -> None:
        """Publish a domain event."""
        pass

    @abstractmethod
    async def publish_batch(
        self, events: list[DomainEvent], routing_key: str | None = None
    ) -> None:
        """Publish multiple domain events."""
        pass

    @abstractmethod
    async def close(self) -> None:
        """Close the publisher connection."""
        pass
