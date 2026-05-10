from __future__ import annotations
import os
from collections.abc import AsyncIterator
from unittest.mock import AsyncMock, MagicMock
import factory
import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
import uuid

from app.api.middleware.request_id import RequestIDMiddleware
from app.main import app as real_app
from app.api.deps import get_db, get_redis_dep
from app.models.base import Base
from app.models.user import User
from app.models.role import Role
from app.core.auth import hash_password

@pytest_asyncio.fixture
async def db_session() -> AsyncIterator[AsyncSession]:
    db_file = f"./test_{uuid.uuid4()}.db"
    db_url = f"sqlite+aiosqlite:///{db_file}"
    engine = create_async_engine(db_url, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with session_factory() as session:
        admin_role_id = uuid.uuid4()
        junior_role_id = uuid.uuid4()
        admin_role = Role(id=admin_role_id, name="ADMIN", description="Admin", permissions=["*"])
        junior_role = Role(id=junior_role_id, name="JUNIOR_DEV", description="Junior", permissions=["engineering"])
        session.add_all([admin_role, junior_role])
        await session.flush()
        
        admin_user = User(
            id=uuid.uuid4(), email="admin@company.com", 
            password_hash=hash_password("Admin123!"), 
            first_name="Admin", last_name="User",
            role_id=admin_role_id, is_active=True
        )
        junior_user = User(
            id=uuid.uuid4(), email="jamie.junior@company.com", 
            password_hash=hash_password("Demo1234!"), 
            first_name="Jamie", last_name="Junior",
            role_id=junior_role_id, is_active=True
        )
        session.add_all([admin_user, junior_user])
        await session.commit()
        
        yield session
    
    await engine.dispose()
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except:
            pass

@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    mock_r = AsyncMock()
    mock_r.exists.return_value = True
    
    def override_get_db():
        yield db_session
    
    def override_get_redis():
        return mock_r
    
    real_app.dependency_overrides[get_db] = override_get_db
    real_app.dependency_overrides[get_redis_dep] = override_get_redis
    
    # Reset app state mocks
    real_app.state.embedding_svc = MagicMock()
    real_app.state.vector_svc = AsyncMock()
    real_app.state.graph_svc = AsyncMock()
    real_app.state.llm_client = AsyncMock()
    real_app.state.expert_router = AsyncMock()
    real_app.state.prompt_builder = MagicMock()
    real_app.state.citation_builder = MagicMock()
    
    transport = ASGITransport(app=real_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    real_app.dependency_overrides.clear()

# ... (other fixtures remain the same)
@pytest_asyncio.fixture
async def async_client() -> AsyncIterator[AsyncClient]:
    app = FastAPI()
    app.add_middleware(RequestIDMiddleware)
    @app.get("/api/v1/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

@pytest.fixture
def mock_db_session() -> AsyncMock:
    return AsyncMock(spec=AsyncSession)

@pytest.fixture
def mock_redis() -> AsyncMock:
    return AsyncMock()

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
def sample_user(user_factory: factory.Factory) -> dict[str, object]:
    return user_factory()

@pytest.fixture
def sample_chunks() -> list[RetrievedChunk]:
    from app.core.vector_search import RetrievedChunk
    return [
        RetrievedChunk(
            chunk_id="1", chunk_text="First sample chunk", source_url="http://example.com/1",
            doc_type="pdf", author="Author 1", timestamp="2024-01-01",
            permission_tag="public", similarity=0.95
        ),
        RetrievedChunk(
            chunk_id="2", chunk_text="Second sample chunk", source_url="http://example.com/2",
            doc_type="docx", author="Author 2", timestamp="2024-01-02",
            permission_tag="private", similarity=0.85
        )
    ]
