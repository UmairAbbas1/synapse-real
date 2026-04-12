"""FastAPI dependencies injected into route handlers."""

from typing import AsyncGenerator
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from qdrant_client import AsyncQdrantClient
from neo4j import AsyncDriver
from redis.asyncio import Redis

from app.db.postgres import get_db_session
from app.db.qdrant import get_qdrant_client
from app.db.neo4j import get_neo4j_driver
from app.db.redis import get_redis_client

async def get_db(session: AsyncSession = Depends(get_db_session)) -> AsyncGenerator[AsyncSession, None]:
    """Dependency: Async SQLAlchemy session."""
    # Since get_db_session already yields the session, FastAPI Depends will
    # pass the yielded session here. We can just yield it further.
    yield session

def get_qdrant() -> AsyncQdrantClient:
    """Dependency: Qdrant vector database client."""
    return get_qdrant_client()

def get_neo4j() -> AsyncDriver:
    """Dependency: Neo4j graph database driver."""
    return get_neo4j_driver()

def get_redis() -> Redis:
    """Dependency: Redis client."""
    return get_redis_client()
