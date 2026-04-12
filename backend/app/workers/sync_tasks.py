import structlog
import asyncio
from celery import shared_task
from sqlalchemy import select

logger = structlog.get_logger(__name__)

async def _trigger_all_syncs():
    from app.db.postgres import async_session_maker
    from app.models.data_source import DataSource
    from app.models.ingestion_job import IngestionJob
    from app.workers.ingestion_tasks import ingest_source
    import uuid

    async with async_session_maker() as session:
        result = await session.execute(
            select(DataSource).where(DataSource.status == "active", DataSource.is_deleted == False)
        )
        sources = result.scalars().all()
        
        for source in sources:
            job_id = str(uuid.uuid4())
            job = IngestionJob(id=job_id, source_id=str(source.id), status="pending")
            session.add(job)
            await session.commit()
            
            ingest_source.delay(str(source.id), job_id)
            logger.info("sync_task_triggered", source_id=str(source.id), job_id=job_id)

@shared_task
def sync_all_sources():
    """Trigger background global data ingestion pipelines automatically natively fetching everything seamlessly."""
    asyncio.run(_trigger_all_syncs())
