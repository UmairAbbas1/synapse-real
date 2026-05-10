"""Structured audit logging to PostgreSQL."""

from __future__ import annotations

import hashlib
import uuid

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog

logger = structlog.get_logger(__name__)


class AuditLogger:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def log(
        self,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str | None,
        details: dict[str, object],
        ip_address: str | None,
        query_hash: str | None = None,
    ) -> uuid.UUID:
        merged = dict(details)
        if resource_id is not None:
            merged.setdefault("resource_id", resource_id)
        if ip_address is not None:
            merged.setdefault("ip_address", ip_address)

        entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            details=merged,
            query_hash=query_hash,
        )
        self.db.add(entry)
        await self.db.commit()
        await self.db.refresh(entry)
        return entry.id

    async def log_query(
        self,
        user_id: str,
        query_text: str,
        chunks: object,
        answer: str,
        ip_address: str | None,
    ) -> uuid.UUID:
        qh = hashlib.sha256(query_text.encode("utf-8")).hexdigest()
        return await self.log(
            user_id=user_id,
            action="execute_query",
            resource_type="query",
            resource_id=None,
            details={
                "chunks_count": len(chunks) if hasattr(chunks, "__len__") else 0,
                "answer_preview": answer[:500],
            },
            ip_address=ip_address,
            query_hash=qh,
        )

    async def log_role_change(
        self,
        admin_id: str,
        target_user_id: str,
        old_role: str,
        new_role: str,
        ip_address: str | None,
    ) -> uuid.UUID:
        return await self.log(
            user_id=admin_id,
            action="role_change",
            resource_type="user",
            resource_id=target_user_id,
            details={"old_role": old_role, "new_role": new_role},
            ip_address=ip_address,
        )

    async def log_source_action(
        self,
        user_id: str,
        action: str,
        source_id: str,
        details: dict[str, object],
        ip_address: str | None,
    ) -> uuid.UUID:
        return await self.log(
            user_id=user_id,
            action=action,
            resource_type="data_source",
            resource_id=source_id,
            details=details,
            ip_address=ip_address,
        )
