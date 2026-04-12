"""Async Neo4j driver singleton."""

from __future__ import annotations

import structlog
from neo4j import AsyncDriver, AsyncGraphDatabase
from neo4j.exceptions import (
    Neo4jError,
    ServiceUnavailable,
    SessionExpired,
)
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import settings

logger = structlog.get_logger(__name__)

_driver: AsyncDriver | None = None


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=10),
    retry=retry_if_exception_type(
        (
            ServiceUnavailable,
            SessionExpired,
            ConnectionError,
            TimeoutError,
            OSError,
        )
    ),
    reraise=True,
)
async def _connect_driver() -> AsyncDriver:
    """Open driver and verify Bolt connectivity (retries on transient failures)."""
    drv = AsyncGraphDatabase.driver(
        settings.NEO4J_URI,
        auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
    )
    try:
        await drv.verify_connectivity()
    except Neo4jError:
        await drv.close()
        raise
    logger.info(
        "neo4j_connected",
        uri=settings.NEO4J_URI,
        user=settings.NEO4J_USER,
    )
    return drv


async def init_neo4j() -> None:
    """Initialize global AsyncDriver at application startup."""
    global _driver
    if _driver is not None:
        logger.info("neo4j_init_skip_already_initialized")
        return
    _driver = await _connect_driver()


async def close_neo4j() -> None:
    """Close Neo4j driver on application shutdown."""
    global _driver
    if _driver is None:
        return
    logger.info("neo4j_close_start")
    await _driver.close()
    _driver = None
    logger.info("neo4j_close_complete")


def get_neo4j_driver() -> AsyncDriver:
    """Return the shared AsyncDriver (must call init_neo4j() first)."""
    if _driver is None:
        raise RuntimeError(
            "Neo4j driver not initialized; call init_neo4j() during application startup",
        )
    return _driver
