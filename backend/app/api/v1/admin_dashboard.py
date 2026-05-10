"""Secure Admin endpoints generating reliable metrics safely checking limits properly."""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.middleware.auth import require_role
from app.db.postgres import get_db_session as get_db
from app.models.audit import AuditLog
from app.models.ingestion_job import IngestionJob
from app.models.user import User

router = APIRouter()


@router.get("/stats", dependencies=[Depends(require_role("ADMIN"))])
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Fetch global variables parsing datasets properly tracking pipelines gracefully."""
    user_count = (await db.execute(select(func.count(User.id)))).scalar_one()
    query_count = (
        await db.execute(select(func.count(AuditLog.id)).where(AuditLog.action == "execute_query"))
    ).scalar_one()

    doc_count = (await db.execute(select(func.sum(IngestionJob.documents_processed)))).scalar_one() or 0

    return {
        "query_count": query_count,
        "document_count": doc_count,
        "user_count": user_count,
        "avg_response_time_ms": 0.0,
    }


@router.get("/health", dependencies=[Depends(require_role("ADMIN"))])
async def get_full_health():
    """Proxy backwards towards established boundaries inherently protecting tracking loops effectively."""
    from app.api.v1.health import readiness_probe

    return await readiness_probe()
