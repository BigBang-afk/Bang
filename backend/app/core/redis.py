import orjson
from redis.asyncio import Redis, from_url

from app.core.config import settings

_redis: Redis | None = None


def get_redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


async def cache_set_json(key: str, value, ttl: int | None = None) -> None:
    redis = get_redis()
    payload = orjson.dumps(value).decode()
    if ttl:
        await redis.set(key, payload, ex=ttl)
    else:
        await redis.set(key, payload)


async def cache_get_json(key: str):
    redis = get_redis()
    raw = await redis.get(key)
    if raw is None:
        return None
    return orjson.loads(raw)


async def cache_publish(channel: str, value) -> None:
    redis = get_redis()
    await redis.publish(channel, orjson.dumps(value).decode())
