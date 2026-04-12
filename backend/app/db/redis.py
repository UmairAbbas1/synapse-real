"""Redis connection pool singleton."""

from __future__ import annotations

import structlog
from redis.asyncio import Redis, ConnectionPool
from app.config import settings

logger = structlog.get_logger(__name__)

_redis_pool: ConnectionPool | None = None
_redis_client: Redis | None = None

async def init_redis() -> None:
    """Initialize Redis connection pool at startup."""
    global _redis_pool, _redis_client
    if _redis_pool is not None:
        return
        
    _redis_pool = ConnectionPool.from_url(
        settings.REDIS_URL,
        decode_responses=True,
    )
    _redis_client = Redis(connection_pool=_redis_pool)
    
    # Test connection by pinging
    try:
        await _redis_client.ping()
        logger.info("redis_connected", url=settings.REDIS_URL)
    except Exception as e:
        logger.error("redis_connection_failed", error=str(e))
        raise

async def close_redis() -> None:
    """Close Redis connection pool on shutdown."""
    global _redis_pool, _redis_client
    if _redis_client is not None:
        logger.info("redis_close_start")
        await _redis_client.aclose()
        if _redis_pool is not None:
            await _redis_pool.disconnect()
        _redis_client = None
        _redis_pool = None
        logger.info("redis_close_complete")

def get_redis_client() -> Redis:
    """Return the shared Redis client."""
    if _redis_client is None:
        raise RuntimeError("Redis client not initialized. Call init_redis() first.")
    return _redis_client
