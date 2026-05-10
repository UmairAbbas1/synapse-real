"""Admin data source CRUD and sync."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.crypto import encrypt_json_credentials
from app.db.postgres import get_db_session as get_db
from app.models.data_source import DataSource
from app.models.ingestion_job import IngestionJob
from app.schemas.auth import CurrentUser
from app.tasks.ingest import ingest_source

router = APIRouter()


class CreateSourceRequest(BaseModel):
    source_type: str
    name: str
    credentials: dict[str, object]
    sync_schedule: str | None = None
    default_permission_tag: str = Field(default="engineering")


class SourceAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    source_type: str
    status: str
    sync_schedule: str | None
    default_permission_tags: list[str]
    created_by: str
    created_at: datetime
    updated_at: datetime


class SyncResponse(BaseModel):
    job_id: str


def _require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def _strip_secrets(cfg: dict[str, object]) -> dict[str, object]:
    out = dict(cfg)
    out.pop("credentials_enc", None)
    return out


@router.get("", response_model=list[SourceAdminResponse])
async def list_sources(
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(_require_admin),
) -> list[SourceAdminResponse]:
    res = await db.execute(select(DataSource).where(DataSource.is_deleted == False).order_by(DataSource.name))  # noqa: E712
    rows = res.scalars().all()
    result: list[SourceAdminResponse] = []
    for s in rows:
        cfg = dict(s.config or {})
        result.append(
            SourceAdminResponse(
                id=str(s.id),
                name=s.name,
                source_type=s.source_type,
                status=s.status,
                sync_schedule=str(cfg.get("sync_schedule")) if cfg.get("sync_schedule") else None,
                default_permission_tags=list(s.default_permission_tags or []),
                created_by=str(s.created_by) if s.created_by is not None else "",
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
        )
    return result


@router.post("", response_model=SourceAdminResponse, status_code=status.HTTP_201_CREATED)
async def create_source(
    body: CreateSourceRequest,
    db: AsyncSession = Depends(get_db),
    admin: CurrentUser = Depends(_require_admin),
) -> SourceAdminResponse:
    enc = encrypt_json_credentials(body.credentials)
    cfg: dict[str, object] = {
        "credentials_enc": enc,
        "sync_schedule": body.sync_schedule,
    }
    row = DataSource(
        name=body.name,
        source_type=body.source_type,
        config=cfg,
        default_permission_tags=[body.default_permission_tag],
        created_by=admin.id,
        status="active",
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return SourceAdminResponse(
        id=str(row.id),
        name=row.name,
        source_type=row.source_type,
        status=row.status,
        sync_schedule=body.sync_schedule,
        default_permission_tags=list(row.default_permission_tags or []),
        created_by=str(row.created_by) if row.created_by is not None else "",
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response, response_model=None)
async def delete_source(
    source_id: str,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(_require_admin),
) -> None:
    row = await db.get(DataSource, uuid.UUID(source_id))
    if not row or row.is_deleted:
        raise HTTPException(status_code=404, detail="Source not found")
    row.status = "paused"
    row.soft_delete()
    await db.commit()


@router.post("/{source_id}/sync", response_model=SyncResponse, status_code=status.HTTP_202_ACCEPTED)
async def sync_now(
    source_id: str,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(_require_admin),
) -> SyncResponse:
    row = await db.get(DataSource, uuid.UUID(source_id))
    if not row or row.is_deleted:
        raise HTTPException(status_code=404, detail="Source not found")
    job_uuid = uuid.uuid4()
    job_id = str(job_uuid)
    db.add(IngestionJob(id=job_uuid, source_id=source_id, status="pending"))
    await db.commit()
    ingest_source.delay(source_id, job_id)
    return SyncResponse(job_id=job_id)


@router.get("/{source_id}/jobs", response_model=list[dict[str, object]])
async def source_jobs(
    source_id: str,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(_require_admin),
) -> list[dict[str, object]]:
    row = await db.get(DataSource, uuid.UUID(source_id))
    if not row or row.is_deleted:
        raise HTTPException(status_code=404, detail="Source not found")
    res = await db.execute(
        select(IngestionJob)
        .where(IngestionJob.source_id == source_id)
        .order_by(IngestionJob.created_at.desc())
        .limit(20)
    )
    jobs = res.scalars().all()
    out: list[dict[str, object]] = []
    for j in jobs:
        out.append(
            {
                "id": str(j.id),
                "source_id": j.source_id,
                "status": j.status,
                "documents_processed": j.documents_processed,
                "chunks_processed": j.chunks_processed,
                "error_message": j.error_message,
                "started_at": j.started_at.isoformat() if j.started_at else None,
                "completed_at": j.completed_at.isoformat() if j.completed_at else None,
                "created_at": j.created_at.isoformat(),
            }
        )
    return out
