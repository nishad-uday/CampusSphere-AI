from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from redis.asyncio import Redis
from app.database.session import engine
from app.core.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        redis = Redis.from_url(settings.redis_url, decode_responses=True)
        try:
            redis_ok = await redis.ping()
        finally:
            await redis.aclose()
        return {
            "status": "ok",
            "application": settings.app_name,
            "database": "connected",
            "redis": "connected" if redis_ok else "unavailable",
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Dependency check failed: {type(exc).__name__}")
