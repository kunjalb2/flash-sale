from aio_pika import Channel
from aio_pika.pool import Pool
from starlette.requests import Request


def get_rmq_channel_pool(request: Request) -> Pool[Channel]:
    """Get RabbitMQ channel pool from app state."""
    return request.app.state.rmq_channel_pool
