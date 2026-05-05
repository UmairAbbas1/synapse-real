from __future__ import annotations

from collections.abc import AsyncIterator
from unittest.mock import AsyncMock, MagicMock

import factory
import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.api.middleware.request_id import RequestIDMiddleware


@pytest_asyncio.fixture
async def async_client() -> AsyncIterator[AsyncClient]:
    """
    ASGI test client fixture.
    Uses a lightweight app to keep tests stable even when app wiring is mid-refactor.
    """
    app = FastAPI()
    app.add_middleware(RequestIDMiddleware)

    @app.get("/api/v1/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest_asyncio.fixture
async def db_session() -> AsyncIterator[AsyncSession]:
    """
    Async DB session fixture for tests.
    Uses in-memory SQLite to keep tests isolated and deterministic.
    """
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()


@pytest.fixture
def mock_qdrant() -> AsyncMock:
    mock = AsyncMock()
    mock.search.return_value = []
    mock.upsert.return_value = None
    return mock


@pytest.fixture
def mock_neo4j() -> AsyncMock:
    mock_driver = AsyncMock()
    mock_session = AsyncMock()
    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__.return_value = mock_session
    mock_session_cm.__aexit__.return_value = None
    mock_driver.session.return_value = mock_session_cm
    return mock_driver


@pytest.fixture
def mock_ollama() -> AsyncMock:
    mock = AsyncMock()
    mock.generate.return_value = "Mocked LLM response"
    mock.model_name = "llama3:8b"
    return mock


@pytest.fixture
def user_factory() -> factory.Factory:
    from tests.factories import UserFactory

    return UserFactory


@pytest.fixture
def data_source_factory() -> factory.Factory:
    from tests.factories import DataSourceFactory

    return DataSourceFactory


@pytest.fixture
def audit_log_factory() -> factory.Factory:
    from tests.factories import AuditLogFactory

    return AuditLogFactory
