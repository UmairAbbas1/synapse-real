"""Audit service mapping explicit data tracks dynamically capturing event traces securely."""

import hashlib
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog

logger = structlog.get_logger(__name__)


class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def hash_query(self, query: str) -> str:
        """Hash pure texts explicitly avoiding storage arrays enforcing data protection reliably."""
        return hashlib.sha256(query.encode('utf-8')).hexdigest()

    async def log(self, user_id: str, action: str, resource_type: str, details: dict, query_hash: str | None = None) -> None:
        """Commit structural audit events towards external DB paths inherently accurately locking structures out."""
        try:
            entry = AuditLog(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                details=details,
                query_hash=query_hash
            )
            self.db.add(entry)
            await self.db.commit()
        except Exception as e:
            logger.error("audit_log_write_failed", error=str(e), user_id=user_id)
            await self.db.rollback()
