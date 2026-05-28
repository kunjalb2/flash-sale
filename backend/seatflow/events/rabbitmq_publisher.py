import json
import logging

import aio_pika
from aio_pika import ExchangeType, Message

from seatflow.config import settings
from seatflow.events.models import DomainEvent
from seatflow.events.publisher import EventPublisher

logger = logging.getLogger(__name__)


class RabbitMQEventPublisher(EventPublisher):
    """RabbitMQ implementation of event publisher."""

    def __init__(self) -> None:
        self._connection: aio_pika.RobustConnection | None = None
        self._channel: aio_pika.RobustChannel | None = None
        self._exchange: aio_pika.RobustExchange | None = None
        self._exchange_name = "seatflow.events"
        self._connected = False

    async def connect(self) -> None:
        """Establish connection to RabbitMQ."""
        if self._connected:
            return

        try:
            url = (
                f"amqp://{settings.rabbit_user}:{settings.rabbit_pass}"
                f"@{settings.rabbit_host}:{settings.rabbit_port}{settings.rabbit_vhost}"
            )
            self._connection = await aio_pika.connect_robust(url)
            self._channel = await self._connection.channel()

            self._exchange = await self._channel.declare_exchange(
                name=self._exchange_name,
                type=ExchangeType.TOPIC,
                durable=True,
            )

            self._connected = True
            logger.info("RabbitMQ event publisher connected")
        except Exception as e:
            logger.error(f"Failed to connect RabbitMQ publisher: {e}")
            raise

    async def publish(self, event: DomainEvent, routing_key: str | None = None) -> None:
        """Publish a domain event to RabbitMQ."""
        if not self._connected:
            await self.connect()

        routing_key = routing_key or f"{event.event_type.value}"

        try:
            message = Message(
                body=json.dumps(event.to_dict()).encode(),
                content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                headers={
                    "event_type": event.event_type.value,
                    "aggregate_id": str(event.aggregate_id),
                    "aggregate_type": event.aggregate_type,
                    "user_id": str(event.user_id) if event.user_id else None,
                    "correlation_id": event.correlation_id,
                },
            )

            await self._exchange.publish(message, routing_key=routing_key)
            logger.debug(
                f"Event published: {event.event_type.value}",
                extra={
                    "event_id": event.id,
                    "aggregate_id": str(event.aggregate_id),
                    "routing_key": routing_key,
                },
            )
        except Exception as e:
            logger.error(f"Failed to publish event {event.event_type.value}: {e}")
            raise

    async def publish_batch(
        self, events: list[DomainEvent], routing_key: str | None = None
    ) -> None:
        """Publish multiple domain events to RabbitMQ."""
        if not self._connected:
            await self.connect()

        for event in events:
            await self.publish(event, routing_key)

    async def close(self) -> None:
        """Close the RabbitMQ connection."""
        if self._connection:
            await self._connection.close()
            self._connected = False
            logger.info("RabbitMQ event publisher disconnected")

    async def __aenter__(self):
        """Async context manager entry."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()


_publisher: RabbitMQEventPublisher | None = None


async def get_event_publisher() -> RabbitMQEventPublisher:
    """Get or create the event publisher singleton."""
    global _publisher
    if _publisher is None:
        _publisher = RabbitMQEventPublisher()
    return _publisher
