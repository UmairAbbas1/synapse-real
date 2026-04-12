"""Async Qdrant client singleton."""

from __future__ import annotations

import httpx
import structlog
from qdrant_client import AsyncQdrantClient
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import settings

logger = structlog.get_logger(__name__)

_client: AsyncQdrantClient | None = None


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=10),
    retry=retry_if_exception_type(
        (
            httpx.ConnectError,
            httpx.TimeoutException,
            ConnectionError,
            TimeoutError,
            OSError,
        )
    ),
    reraise=True,
)
async def _connect_client() -> AsyncQdrantClient:
    """Create client and verify connectivity (retries on transport failures)."""
    client = AsyncQdrantClient(
        host=settings.QDRANT_HOST,
        port=settings.QDRANT_PORT,
    )
    await client.get_collections()
    logger.info(
        "qdrant_connected",
        host=settings.QDRANT_HOST,
        port=settings.QDRANT_PORT,
    )
    return client


async def init_qdrant() -> None:
    """Initialize global AsyncQdrantClient at application startup."""
    global _client
    if _client is not None:
        logger.info("qdrant_init_skip_already_initialized")
        return
    _client = await _connect_client()


async def close_qdrant() -> None:
    """Close Qdrant client on application shutdown."""
    global _client
    if _client is None:
        return
    logger.info("qdrant_close_start")
    await _client.close()
    _client = None
    logger.info("qdrant_close_complete")


def get_qdrant_client() -> AsyncQdrantClient:
    """Return the shared AsyncQdrantClient (must call init_qdrant() first)."""
    if _client is None:
        raise RuntimeError(
            "Qdrant client not initialized; call init_qdrant() during application startup",
        )
    return _client
