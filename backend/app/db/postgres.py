"""Async SQLAlchemy engine and session factory (PostgreSQL + asyncpg)."""

from __future__ import annotations

from collections.abc import AsyncGenerator

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings

logger = structlog.get_logger()

_engine: AsyncEngine | None = None
_async_session_factory: async_sessionmaker[AsyncSession] | None = None


def _ensure_engine() -> AsyncEngine:
    global _engine, _async_session_factory
    if _engine is None:
        _engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.DEBUG,
            pool_pre_ping=True,
        )
        _async_session_factory = async_sessionmaker(
            _engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _engine


def get_async_session_factory() -> async_sessionmaker[AsyncSession]:
    """Return the shared async session factory (initializes engine if needed)."""
    _ensure_engine()
    assert _async_session_factory is not None
    return _async_session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI-compatible dependency: yield an AsyncSession and close after request."""
    factory = get_async_session_factory()
    async with factory() as session:
        yield session


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Compatibility dependency alias for route imports expecting get_db."""
    async for session in get_db_session():
        yield session


async def init_db() -> None:
    """Verify database connectivity at application startup."""
    eng = _ensure_engine()
    logger.info("postgres_init_start", host=settings.POSTGRES_HOST, db=settings.POSTGRES_DB)
    async with eng.connect() as conn:
        await conn.execute(text("SELECT 1"))
    logger.info("postgres_init_complete")


async def close_db() -> None:
    """Dispose engine on application shutdown."""
    global _engine, _async_session_factory
    if _engine is not None:
        logger.info("postgres_close_start")
        await _engine.dispose()
        _engine = None
        _async_session_factory = None
        logger.info("postgres_close_complete")
