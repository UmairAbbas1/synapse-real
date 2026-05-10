import structlog
import asyncio
from celery import shared_task
from sqlalchemy import select

logger = structlog.get_logger(__name__)

async def _trigger_all_syncs():
    from app.db.postgres import get_async_session_factory
    from app.models.data_source import DataSource
    from app.tasks.ingest import ingest_source

    factory = get_async_session_factory()
    async with factory() as session:
        result = await session.execute(
            select(DataSource).where(
                DataSource.status == "active",
                DataSource.is_deleted.is_(False),
            )
        )
        sources = result.scalars().all()
        
        for source in sources:
            ingest_source.delay(str(source.id))
            logger.info("sync_task_triggered", source_id=str(source.id))

@shared_task
def sync_all_sources():
    """Trigger background global data ingestion pipelines automatically natively fetching everything seamlessly."""
    asyncio.run(_trigger_all_syncs())
