import asyncio
from contextlib import asynccontextmanager
from typing import Any
from uuid import UUID

from redis.asyncio import Redis as AsyncRedis

from seatflow.core.exceptions import LockConflictException
from seatflow.config import settings


class DistributedLockService:
    LOCK_PREFIX = "seatflow:lock:"
    DEFAULT_LOCK_TIMEOUT_SECONDS = 10

    def __init__(self, redis_client: AsyncRedis) -> None:
        self.redis = redis_client
        self.enabled = settings.enable_distributed_lock

    def _make_key(self, *parts: Any) -> str:
        return self.LOCK_PREFIX + ":".join(str(p) for p in parts)

    async def acquire(self, lock_key: str, timeout_seconds: int | None = None, wait_seconds: float = 0.0) -> bool:
        if not self.enabled:
            return True
        if wait_seconds > 0:
            start = asyncio.get_event_loop().time()
            while True:
                acquired = await self._try_acquire(lock_key, timeout_seconds)
                if acquired:
                    return True
                elapsed = asyncio.get_event_loop().time() - start
                if elapsed >= wait_seconds:
                    return False
                await asyncio.sleep(0.05)
        else:
            return await self._try_acquire(lock_key, timeout_seconds)

    async def _try_acquire(self, lock_key: str, timeout_seconds: int | None) -> bool:
        if not self.enabled:
            return True
        timeout = timeout_seconds if timeout_seconds is not None else self.DEFAULT_LOCK_TIMEOUT_SECONDS
        return bool(await self.redis.set(self._make_key(lock_key), "locked", nx=True, ex=timeout))

    async def release(self, lock_key: str) -> None:
        if not self.enabled:
            return
        await self.redis.delete(self._make_key(lock_key))

    @asynccontextmanager
    async def lock(self, lock_key: str, timeout_seconds: int | None = None, wait_seconds: float = 0.0):
        acquired = await self.acquire(lock_key, timeout_seconds, wait_seconds)
        if not acquired:
            raise LockConflictException(detail="Resource is currently locked. Please try again.")
        try:
            yield
        finally:
            await self.release(lock_key)

    @asynccontextmanager
    async def event_lock(self, event_id: UUID, timeout_seconds: int | None = None, wait_seconds: float = 0.0):
        async with self.lock(f"event:{event_id}", timeout_seconds, wait_seconds):
            yield
