"""Background hooks purging memory footprint cleanly."""

import structlog
import asyncio
from celery import shared_task
from sqlalchemy import text, delete
from datetime import datetime, timedelta, timezone

logger = structlog.get_logger(__name__)

async def _cleanup_sessions():
    from app.db.postgres import get_async_session_factory
    factory = get_async_session_factory()
    async with factory() as session:
        result = await session.execute(text("DELETE FROM user_sessions WHERE expires_at < NOW()"))
        await session.commit()
        logger.info("cleanup_sessions_completed", rows_deleted=result.rowcount)

async def _cleanup_audit_logs():
    from app.db.postgres import get_async_session_factory
    from app.models.audit import AuditLog
    factory = get_async_session_factory()
    async with factory() as session:
        cutoff = datetime.now(timezone.utc) - timedelta(days=90)
        stmt = delete(AuditLog).where(AuditLog.created_at < cutoff)
        result = await session.execute(stmt)
        await session.commit()
        logger.info("cleanup_audit_logs_completed", rows_deleted=result.rowcount)

@shared_task
def cleanup_expired_sessions():
    """Wipe orphaned token instances blocking potential exploitation footprints natively."""
    asyncio.run(_cleanup_sessions())

@shared_task
def cleanup_old_audit_logs():
    """Protect strict SQL bounds wiping metrics out after explicit 90 day parameter definitions naturally."""
    asyncio.run(_cleanup_audit_logs())
