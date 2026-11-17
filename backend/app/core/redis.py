
from redis.asyncio import Redis

from app.core.config import settings


# Reusable Redis connection
redis_client = Redis.from_url(
    settings.redis_url,
    decode_responses=True,
)


async def get_redis() -> Redis:
    """Provide the shared Redis connection."""
    return redis_client
