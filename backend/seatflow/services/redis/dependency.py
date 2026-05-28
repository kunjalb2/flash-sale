from typing import AsyncGenerator

from redis.asyncio import ConnectionPool, Redis
from starlette.requests import Request


async def get_redis_pool(request: Request) -> ConnectionPool:
    """Get Redis connection pool from app state."""
    return request.app.state.redis_pool


async def get_redis_client(request: Request) -> Redis:
    """Get Redis client from app state."""
    return request.app.state.redis
