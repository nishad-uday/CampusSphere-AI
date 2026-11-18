
import logging

from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from redis.asyncio import Redis

from app.database.session import engine
from app.core.config import settings

router = APIRouter(tags=["Health"])

logger = logging.getLogger(__name__)


@router.get("/health")
async def health_check():

    # Check PostgreSQL
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))

    except Exception as exc:
        logger.exception("DATABASE CONNECTION FAILED")

        raise HTTPException(
            status_code=503,
            detail={
                "status": "error",
                "database": "unavailable",
                "redis": "not_checked",
                "error": type(exc).__name__
            }
        )

    # Check Redis
    redis = Redis.from_url(
        settings.redis_url,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=5
    )

    try:
        redis_ok = await redis.ping()

        if not redis_ok:
            raise RuntimeError("Redis ping failed")

    except Exception as exc:
        logger.exception("REDIS CONNECTION FAILED")

        raise HTTPException(
            status_code=503,
            detail={
                "status": "error",
                "database": "connected",
                "redis": "unavailable",
                "error": type(exc).__name__
            }
        )

    finally:
        await redis.aclose()

    return {
        "status": "ok",
        "application": settings.app_name,
        "database": "connected",
        "redis": "connected"
    }
