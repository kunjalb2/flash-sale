import time
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Request
from redis.asyncio import Redis as AsyncRedis

from seatflow.core.exceptions import RateLimitException
from seatflow.config import settings


@dataclass
class RateLimitConfig:
    requests: int
    window_seconds: int
    key_prefix: str


class RateLimiter:
    LOGIN = RateLimitConfig(requests=settings.rate_limit_login_requests, window_seconds=settings.rate_limit_login_window, key_prefix="login")
    REGISTER = RateLimitConfig(requests=settings.rate_limit_register_requests, window_seconds=settings.rate_limit_register_window, key_prefix="register")
    RESERVATION = RateLimitConfig(requests=settings.rate_limit_reservation_requests, window_seconds=settings.rate_limit_reservation_window, key_prefix="reservation")
    DEFAULT = RateLimitConfig(requests=settings.rate_limit_per_minute, window_seconds=60, key_prefix="default")

    def __init__(self, redis: AsyncRedis, enabled: bool = True) -> None:
        self.redis = redis
        self.enabled = enabled

    async def check_rate_limit(self, identifier: str, config: RateLimitConfig) -> None:
        if not self.enabled:
            return
        key = f"ratelimit:{config.key_prefix}:{identifier}"
        current_time = int(time.time() * 1000)
        window_start = current_time - config.window_seconds

        await self.redis.zremrangebyscore(key, 0, window_start)
        request_count = await self.redis.zcard(key)

        if request_count >= config.requests:
            ttl = await self.redis.ttl(key)
            raise RateLimitException(detail=f"Rate limit exceeded. Max {config.requests} requests per {config.window_seconds}s. Try again in {max(0, ttl)}s.")

        pipe = self.redis.pipeline()
        pipe.zadd(key, {str(current_time): current_time})
        pipe.expire(key, config.window_seconds)
        await pipe.execute()


def get_client_identifier(request: Request) -> str:
    user = getattr(request.state, "user", None)
    if user and hasattr(user, "id"):
        return f"user:{user.id}"
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return f"ip:{forwarded_for.split(',')[0].strip()}"
    return f"ip:{request.client.host}"


async def get_rate_limiter(request: Request) -> RateLimiter:
    redis_client = request.app.state.redis
    return RateLimiter(redis_client, enabled=settings.rate_limit_enabled)


def make_rate_limit_check(config: RateLimitConfig):
    async def check(request: Request, limiter: Annotated[RateLimiter, Depends(get_rate_limiter)]) -> None:
        identifier = get_client_identifier(request)
        await limiter.check_rate_limit(identifier, config)
    return check


LoginRateLimit = Annotated[None, Depends(make_rate_limit_check(RateLimiter.LOGIN))]
RegisterRateLimit = Annotated[None, Depends(make_rate_limit_check(RateLimiter.REGISTER))]
ReservationRateLimit = Annotated[None, Depends(make_rate_limit_check(RateLimiter.RESERVATION))]
