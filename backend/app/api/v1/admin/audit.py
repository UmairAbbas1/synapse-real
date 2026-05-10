"""Admin audit log access and GDPR utilities."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_audit_logger, get_current_user
from app.core.audit_logger import AuditLogger
from app.db.neo4j import get_neo4j_driver
from app.db.postgres import get_db_session as get_db
from app.models.audit import AuditLog
from app.schemas.auth import CurrentUser
from app.schemas.common import PageResponse

router = APIRouter()


class AuditEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    action: str
    resource_type: str
    details: dict[str, object]
    query_hash: str | None
    created_at: datetime


def _require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


@router.get("/audit", response_model=PageResponse[AuditEntryResponse])
async def list_audit(
    user_id: str | None = None,
    action: str | None = None,
    from_dt: datetime | None = None,
    to_dt: datetime | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(_require_admin),
) -> PageResponse[AuditEntryResponse]:
    stmt = select(AuditLog)
    if user_id:
        stmt = stmt.where(AuditLog.user_id == user_id)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if from_dt:
        stmt = stmt.where(AuditLog.created_at >= from_dt)
    if to_dt:
        stmt = stmt.where(AuditLog.created_at <= to_dt)

    count_q = select(func.count()).select_from(stmt.order_by(None).subquery())
    total = int((await db.execute(count_q)).scalar_one())

    stmt = stmt.order_by(AuditLog.created_at.desc()).offset((page - 1) * size).limit(size)
    rows = (await db.execute(stmt)).scalars().all()
    items = [
        AuditEntryResponse(
            id=str(r.id),
            user_id=r.user_id,
            action=r.action,
            resource_type=r.resource_type,
            details=dict(r.details or {}),
            query_hash=r.query_hash,
            created_at=r.created_at,
        )
        for r in rows
    ]
    return PageResponse(items=items, total=total, page=page, size=size)


@router.get("/audit/{audit_id}", response_model=AuditEntryResponse)
async def get_audit_entry(
    audit_id: str,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(_require_admin),
) -> AuditEntryResponse:
    row = await db.get(AuditLog, uuid.UUID(audit_id))
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return AuditEntryResponse(
        id=str(row.id),
        user_id=row.user_id,
        action=row.action,
        resource_type=row.resource_type,
        details=dict(row.details or {}),
        query_hash=row.query_hash,
        created_at=row.created_at,
    )


@router.delete("/gdpr/user/{email}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response, response_model=None)
async def gdpr_erase_user(
    email: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    audit: AuditLogger = Depends(get_audit_logger),
    admin: CurrentUser = Depends(_require_admin),
    x_confirm_erasure: str | None = Header(default=None, alias="X-Confirm-Erasure"),
) -> None:
    if (x_confirm_erasure or "").lower() != "true":
        raise HTTPException(status_code=400, detail="Missing X-Confirm-Erasure: true")

    await db.execute(text("DELETE FROM document_chunks WHERE author = :email"), {"email": email})
    await db.commit()

    driver = get_neo4j_driver()
    async with driver.session() as session:
        await session.run("MATCH (p:Person {email: $email}) DETACH DELETE p", email=email)

    await audit.log(
        user_id=admin.id,
        action="gdpr_erasure",
        resource_type="user",
        resource_id=email,
        details={"email": email},
        ip_address=request.client.host if request.client else None,
    )
