import hashlib
import json
from typing import Any
from uuid import UUID

import orjson
from redis.asyncio import Redis as AsyncRedis

from seatflow.config import settings


class CacheService:
    CACHE_PREFIX = "seatflow:"
    DEFAULT_TTL_SECONDS = settings.cache_ttl_seconds
    EVENT_DETAIL_TTL_SECONDS = settings.cache_event_detail_ttl_seconds
    EVENT_LIST_TTL_SECONDS = settings.cache_event_list_ttl_seconds

    def __init__(self, redis_client: AsyncRedis) -> None:
        self.redis = redis_client
        self.enabled = settings.cache_enabled

    def _make_key(self, *parts: Any) -> str:
        return self.CACHE_PREFIX + ":".join(str(p) for p in parts)

    def _hash_dict(self, data: dict[str, Any]) -> str:
        sorted_data = json.dumps(data, sort_keys=True, default=str)
        return hashlib.md5(sorted_data.encode()).hexdigest()

    async def get(self, key: str) -> Any | None:
        if not self.enabled:
            return None
        cached = await self.redis.get(self._make_key(key))
        return orjson.loads(cached) if cached else None

    async def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        if not self.enabled:
            return
        ttl = ttl_seconds if ttl_seconds is not None else self.DEFAULT_TTL_SECONDS
        await self.redis.set(self._make_key(key), orjson.dumps(value), ex=ttl)

    async def delete(self, key: str) -> None:
        if not self.enabled:
            return
        await self.redis.delete(self._make_key(key))

    async def delete_pattern(self, pattern: str) -> int:
        if not self.enabled:
            return 0
        keys = [k async for k in self.redis.scan_iter(match=self._make_key(pattern))]
        return await self.redis.delete(*keys) if keys else 0

    async def exists(self, key: str) -> bool:
        if not self.enabled:
            return False
        return bool(await self.redis.exists(self._make_key(key)))

    async def invalidate_event(self, event_id: UUID) -> None:
        if not self.enabled:
            return
        await self.delete(f"event:{event_id}")
        await self.delete_pattern("events:*")

    async def invalidate_events(self) -> None:
        if not self.enabled:
            return
        await self.delete_pattern("events:*")

    async def get_event(self, event_id: UUID) -> Any | None:
        if not self.enabled:
            return None
        cached = await self.redis.get(self._make_key(f"event:{event_id}"))
        return orjson.loads(cached) if cached else None

    async def set_event(self, event_id: UUID, event_data: Any, ttl_seconds: int | None = None) -> None:
        if not self.enabled:
            return
        ttl = ttl_seconds if ttl_seconds is not None else self.EVENT_DETAIL_TTL_SECONDS
        await self.redis.set(self._make_key(f"event:{event_id}"), orjson.dumps(event_data), ex=ttl)

    async def get_events_list(self, page: int, size: int, filters: dict[str, Any] | None = None) -> Any | None:
        if not self.enabled:
            return None
        filter_hash = self._hash_dict(filters) if filters else "none"
        cached = await self.redis.get(self._make_key(f"events:{page}:{size}:{filter_hash}"))
        return orjson.loads(cached) if cached else None

    async def set_events_list(self, page: int, size: int, data: Any, filters: dict[str, Any] | None = None, ttl_seconds: int | None = None) -> None:
        if not self.enabled or data is None:
            return
        filter_hash = self._hash_dict(filters) if filters else "none"
        ttl = ttl_seconds if ttl_seconds is not None else self.EVENT_LIST_TTL_SECONDS
        await self.redis.set(self._make_key(f"events:{page}:{size}:{filter_hash}"), orjson.dumps(data), ex=ttl)
