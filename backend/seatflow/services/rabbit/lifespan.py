import aio_pika
from aio_pika.abc import AbstractChannel, AbstractRobustConnection
from aio_pika.pool import Pool
from fastapi import FastAPI

from seatflow.config import settings


def init_rabbit(app: FastAPI) -> None:
    """Initialize RabbitMQ connection and channel pools."""
    async def get_connection() -> AbstractRobustConnection:
        return await aio_pika.connect_robust(str(settings.rabbit_url))

    connection_pool: Pool[AbstractRobustConnection] = Pool(get_connection, max_size=settings.rabbit_pool_size)

    async def get_channel() -> AbstractChannel:
        async with connection_pool.acquire() as connection:
            return await connection.channel()

    channel_pool: Pool[aio_pika.Channel] = Pool(get_channel, max_size=settings.rabbit_channel_pool_size)

    app.state.rmq_pool = connection_pool
    app.state.rmq_channel_pool = channel_pool


async def shutdown_rabbit(app: FastAPI) -> None:
    """Close RabbitMQ pools."""
    if hasattr(app.state, "rmq_channel_pool"):
        await app.state.rmq_channel_pool.close()
    if hasattr(app.state, "rmq_pool"):
        await app.state.rmq_pool.close()
