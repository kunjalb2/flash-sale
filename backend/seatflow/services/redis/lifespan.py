from fastapi import FastAPI
from redis.asyncio import ConnectionPool, Redis as AsyncRedis

from seatflow.config import settings


def init_redis(app: FastAPI) -> None:
    """Initialize Redis connection pool."""
    app.state.redis_pool = ConnectionPool.from_url(
        str(settings.redis_url),
        max_connections=settings.redis_max_connections,
    )
    app.state.redis = AsyncRedis(connection_pool=app.state.redis_pool, decode_responses=True)


async def shutdown_redis(app: FastAPI) -> None:
    """Close Redis connections."""
    if hasattr(app.state, "redis") and app.state.redis:
        await app.state.redis.close()
    if hasattr(app.state, "redis_pool") and app.state.redis_pool:
        await app.state.redis_pool.disconnect()
