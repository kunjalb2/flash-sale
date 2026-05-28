import json
import logging
from abc import ABC, abstractmethod
from typing import Any, Callable

from aio_pika import ExchangeType, IncomingMessage
from aio_pika.abc import AbstractExchange, AbstractQueue

from seatflow.config import settings
from seatflow.events.models import DomainEvent, EventType

logger = logging.getLogger(__name__)


class EventHandler(ABC):
    """Base class for event handlers."""

    @abstractmethod
    async def handle(self, event: DomainEvent) -> None:
        """Handle a domain event."""
        pass


class EventConsumer:
    """RabbitMQ event consumer."""

    def __init__(self) -> None:
        self._connection: Any = None
        self._channel: Any = None
        self._exchange: AbstractExchange | None = None
        self._handlers: dict[EventType, list[EventHandler]] = {}
        self._exchange_name = "seatflow.events"
        self._queue_name = "seatflow.events.consumer"
        self._connected = False

    def register_handler(self, event_type: EventType, handler: EventHandler) -> None:
        """Register an event handler for a specific event type."""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)
        logger.info(f"Registered handler for {event_type.value}: {handler.__class__.__name__}")

    async def connect(self) -> None:
        """Establish connection to RabbitMQ and setup consumers."""
        if self._connected:
            return

        try:
            import aio_pika

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

            queue: AbstractQueue = await self._channel.declare_queue(
                name=self._queue_name,
                durable=True,
                arguments={"x-max-priority": 10},
            )

            routing_patterns = [
                "*.created",
                "*.completed",
                "*.expired",
                "*.cancelled",
                "*.failed",
            ]

            for pattern in routing_patterns:
                await queue.bind(self._exchange, routing_key=pattern)

            async with queue.iterator() as queue_iter:
                async for message in queue_iter:
                    await self._process_message(message)

        except Exception as e:
            logger.error(f"Failed to connect RabbitMQ consumer: {e}")
            raise

    async def _process_message(self, message: IncomingMessage) -> None:
        """Process an incoming message."""
        try:
            async with message.process():
                body = message.body.decode()
                event_data = json.loads(body)

                event_type = event_data.get("event_type")
                if not event_type:
                    logger.warning(
                        "Received message without event_type", extra={"body": event_data}
                    )
                    return

                event = DomainEvent(
                    event_type=EventType(event_type),
                    aggregate_id=event_data["aggregate_id"],
                    aggregate_type=event_data["aggregate_type"],
                    data=event_data["data"],
                    user_id=event_data.get("user_id"),
                    correlation_id=event_data.get("correlation_id"),
                )

                handlers = self._handlers.get(event.event_type, [])
                if not handlers:
                    logger.debug(f"No handlers registered for {event_type}")
                    return

                for handler in handlers:
                    try:
                        await handler.handle(event)
                        logger.debug(
                            f"Handler {handler.__class__.__name__} processed event {event_type}",
                            extra={
                                "event_id": event.id,
                                "aggregate_id": str(event.aggregate_id),
                            },
                        )
                    except Exception as e:
                        logger.error(
                            f"Handler {handler.__class__.__name__} failed for event {event_type}: {e}",
                            exc_info=True,
                        )

        except Exception as e:
            logger.error(f"Failed to process message: {e}", exc_info=True)

    async def close(self) -> None:
        """Close the RabbitMQ connection."""
        if self._connection:
            await self._connection.close()
            self._connected = False
            logger.info("RabbitMQ event consumer disconnected")


_consumer: EventConsumer | None = None


def get_event_consumer() -> EventConsumer:
    """Get or create the event consumer singleton."""
    global _consumer
    if _consumer is None:
        _consumer = EventConsumer()
    return _consumer
