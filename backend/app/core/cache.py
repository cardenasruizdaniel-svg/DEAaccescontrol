import json
from typing import Any

import redis.asyncio as redis

from app.core.config import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


class CacheService:
    @staticmethod
    async def get(key: str) -> Any | None:
        data = await redis_client.get(key)
        if data:
            return json.loads(data)
        return None

    @staticmethod
    async def set(key: str, value: Any, ttl: int | None = None) -> None:
        await redis_client.set(
            key,
            json.dumps(value, default=str),
            ex=ttl or settings.REDIS_CACHE_TTL,
        )

    @staticmethod
    async def delete(key: str) -> None:
        await redis_client.delete(key)

    @staticmethod
    async def delete_pattern(pattern: str) -> None:
        keys = []
        async for key in redis_client.scan_iter(match=pattern):
            keys.append(key)
        if keys:
            await redis_client.delete(*keys)

    @staticmethod
    async def exists(key: str) -> bool:
        return await redis_client.exists(key) > 0
