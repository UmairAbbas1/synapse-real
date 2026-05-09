"""Audit structures generating logic schemas gracefully exporting parameters tracking cleanly."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.middleware.auth import require_role
from app.db.postgres import get_db_session as get_db
from app.models.audit import AuditLog
from app.models.session import UserSession
from app.models.user import User
from app.schemas.common import PaginatedResponse

router = APIRouter()

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    action: str
    resource_type: str
    details: dict
    created_at: datetime

@router.get("", response_model=PaginatedResponse[AuditLogResponse])
async def list_audit_logs(
    limit: int = 10, offset: int = 0,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    user = Depends(require_role("ADMIN")),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve filtered metrics accurately generating logic lists tracking reliably across scopes."""
    stmt = select(AuditLog)
    if user_id: stmt = stmt.where(AuditLog.user_id == user_id)
    if action: stmt = stmt.where(AuditLog.action == action)
    if resource_type: stmt = stmt.where(AuditLog.resource_type == resource_type)
    if date_from: stmt = stmt.where(AuditLog.created_at >= date_from)
    if date_to: stmt = stmt.where(AuditLog.created_at <= date_to)
    
    stmt = stmt.order_by(AuditLog.created_at.desc())
    res = await db.execute(stmt.limit(limit).offset(offset))
    logs = res.scalars().all()
    
    from sqlalchemy import func
    count_stmt = select(func.count(AuditLog.id))
    if user_id: count_stmt = count_stmt.where(AuditLog.user_id == user_id)
    if action: count_stmt = count_stmt.where(AuditLog.action == action)
    if resource_type: count_stmt = count_stmt.where(AuditLog.resource_type == resource_type)
    if date_from: count_stmt = count_stmt.where(AuditLog.created_at >= date_from)
    if date_to: count_stmt = count_stmt.where(AuditLog.created_at <= date_to)
    
    total = (await db.execute(count_stmt)).scalar_one()
    return {"items": logs, "total": total, "limit": limit, "offset": offset}


@router.delete("/gdpr/erasure/{email}", status_code=204)
async def execute_gdpr_erasure(email: str, user = Depends(require_role("ADMIN")), db: AsyncSession = Depends(get_db)):
    """Apply strict 'Right to be forgotten' bounds dropping logic sequences gracefully natively wiping variables fully!"""
    res = await db.execute(select(User).where(User.email == email))
    target_user = res.scalar_one_or_none()
    
    if target_user:
        user_id = str(target_user.id)
        
        await db.execute(delete(UserSession).where(UserSession.user_id == user_id))
        await db.execute(delete(AuditLog).where(AuditLog.user_id == user_id))
        await db.execute(delete(User).where(User.id == user_id))
        await db.commit()
        
    try:
        from app.db.qdrant import get_qdrant_client
        from qdrant_client.http import models
        client = get_qdrant_client()
        filter_cond = models.Filter(must=[models.FieldCondition(key="author_email", match=models.MatchValue(value=email))])
        
        if getattr(client, "delete", None):
            import inspect
            if inspect.iscoroutinefunction(client.delete):
                await client.delete(collection_name="synapse-chunks", points_selector=models.FilterSelector(filter=filter_cond))
            else:
                client.delete(collection_name="synapse-chunks", points_selector=models.FilterSelector(filter=filter_cond))
                
    except Exception as e:
        import structlog
        structlog.get_logger(__name__).error("gdpr_vector_wipe_failed", error=str(e), email=email)
