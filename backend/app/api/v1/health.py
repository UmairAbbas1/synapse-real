from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from qdrant_client import AsyncQdrantClient
from neo4j import AsyncDriver
from redis.asyncio import Redis
import httpx
import structlog

from app.schemas.admin import SystemHealth
from app.dependencies import get_db, get_qdrant, get_neo4j, get_redis
from app.config import settings

logger = structlog.get_logger(__name__)
router = APIRouter()

@router.get("", status_code=status.HTTP_200_OK)
async def liveness_probe() -> dict[str, str]:
    """Liveness probe. Returns status ok. No DB checks."""
    return {"status": "ok"}

@router.get("/ready", response_model=SystemHealth)
async def readiness_probe(
    db: AsyncSession = Depends(get_db),
    qdrant: AsyncQdrantClient = Depends(get_qdrant),
    neo_driver: AsyncDriver = Depends(get_neo4j),
    redis: Redis = Depends(get_redis),
) -> SystemHealth:
    """Readiness probe. Checks ALL services."""
    health_status = {
        "api": True,
        "postgres": False,
        "qdrant": False,
        "neo4j": False,
        "redis": False,
        "ollama": False,
    }
    
    # 1. PostgreSQL
    try:
        await db.execute(text("SELECT 1"))
        health_status["postgres"] = True
    except Exception as e:
        logger.error("postgres_health_check_failed", error=str(e))

    # 2. Qdrant
    try:
        await qdrant.get_collections()
        health_status["qdrant"] = True
    except Exception as e:
        logger.error("qdrant_health_check_failed", error=str(e))

    # 3. Neo4j
    try:
        async with neo_driver.session() as session:
            await session.run("RETURN 1")
        health_status["neo4j"] = True
    except Exception as e:
        logger.error("neo4j_health_check_failed", error=str(e))

    # 4. Redis
    try:
        await redis.ping()
        health_status["redis"] = True
    except Exception as e:
        logger.error("redis_health_check_failed", error=str(e))

    # 5. Ollama
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                health_status["ollama"] = True
    except Exception as e:
        logger.error("ollama_health_check_failed", error=str(e))

    all_healthy = all(health_status.values())
    if not all_healthy:
        failed_services = [service for service, h in health_status.items() if not h]
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"failed_services": failed_services, "health_status": health_status}
        )
        
    return SystemHealth(**health_status)
