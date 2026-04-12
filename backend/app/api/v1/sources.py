"""Data Source routing API securely driving internal administration and external background workers."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.services.source_service import SourceService
from app.schemas.source import SourceCreate, SourceUpdate, SourceResponse
from app.schemas.common import PaginatedResponse
from app.core.auth import get_current_user
from app.workers.ingestion_tasks import ingest_source
from app.models.ingestion_job import IngestionJob

router = APIRouter()

# Proxy dynamically matching core routes
def get_db():
    from app.db.postgres import get_db as global_db
    return global_db()

def get_source_service(db: AsyncSession = Depends(get_db)) -> SourceService:
    return SourceService(db)

def require_role(role: str):
    def role_checker(user: dict = Depends(get_current_user)):
        roles = user.get("roles", []) if isinstance(user, dict) else getattr(user, "permissions", [getattr(user, "role", None)])
        if role not in roles and "*" not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return role_checker

@router.get("", response_model=PaginatedResponse[SourceResponse])
async def list_sources(
    limit: int = 10, offset: int = 0,
    user = Depends(require_role("ADMIN")),
    svc: SourceService = Depends(get_source_service)
):
    """View active document pipelines globally reliably scaling outputs inside bounds."""
    sources, total = await svc.list_sources(limit, offset)
    return {"items": sources, "total": total, "limit": limit, "offset": offset}

@router.post("", response_model=SourceResponse)
async def create_source(
    data: SourceCreate,
    user = Depends(require_role("ADMIN")),
    svc: SourceService = Depends(get_source_service)
):
    """Instantiate integrations defining core security token paths and graph metadata explicitly."""
    user_id = user.get("sub", "admin") if isinstance(user, dict) else getattr(user, "sub", "admin")
    return await svc.create_source(data, user_id)

@router.get("/{id}", response_model=SourceResponse)
async def get_source(id: str, svc: SourceService = Depends(get_source_service)):
    """Fetch specific underlying metadata reliably defining source boundaries securely."""
    return await svc.get_source(id)

@router.put("/{id}", response_model=SourceResponse)
async def update_source(
    id: str,
    data: SourceUpdate,
    user = Depends(require_role("ADMIN")),
    svc: SourceService = Depends(get_source_service)
):
    """Override standard parameters successfully shifting schema boundaries actively."""
    return await svc.update_source(id, data)

@router.delete("/{id}", status_code=204)
async def delete_source(
    id: str,
    user = Depends(require_role("ADMIN")),
    svc: SourceService = Depends(get_source_service)
):
    """Disconnect sources dynamically forcing asynchronous cleanup sequences gracefully wiping isolated components natively."""
    await svc.delete_source(id)

@router.post("/{id}/sync", status_code=202)
async def sync_source(id: str, db: AsyncSession = Depends(get_db)):
    """Execute manual background ingestion loops dropping manual pipelines precisely towards Celery hooks safely."""
    svc = SourceService(db)
    await svc.get_source(id) # Assert presence inherently logically protecting routes properly
    
    import uuid
    job_id = str(uuid.uuid4())
    job = IngestionJob(id=job_id, source_id=id, status="pending")
    db.add(job)
    await db.commit()
    
    # Spawn background worker asynchronously structurally bypassing memory locks actively!
    ingest_source.delay(id, job_id)
    return {"status": "accepted", "job_id": job_id}

@router.get("/{id}/jobs")
async def get_jobs(id: str, limit: int = 10, offset: int = 0, db: AsyncSession = Depends(get_db)):
    """Examine running ingestion progress outputs mapping variables seamlessly inside standard frameworks!"""
    svc = SourceService(db)
    await svc.get_source(id)
    
    from sqlalchemy import func
    res = await db.execute(
        select(IngestionJob)
        .where(IngestionJob.source_id == id)
        .order_by(IngestionJob.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    jobs = res.scalars().all()
    
    count_res = await db.execute(select(func.count(IngestionJob.id)).where(IngestionJob.source_id == id))
    total = count_res.scalar_one()
    
    return {"items": jobs, "total": total, "limit": limit, "offset": offset}
