"""Async Qdrant client singleton."""

from __future__ import annotations

import httpx
import structlog
from typing import Any
# removed: was qdrant, now using pgvector
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import settings

logger = structlog.get_logger(__name__)

_client: Any | None = None


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
async def _connect_client() -> Any:
    return None


async def init_qdrant() -> None:
    """Initialize global Any at application startup."""
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


def get_qdrant_client() -> Any:
    """Return the shared Any (must call init_qdrant() first)."""
    if _client is None:
        raise RuntimeError(
            "Qdrant client not initialized; call init_qdrant() during application startup",
        )
    return _client
