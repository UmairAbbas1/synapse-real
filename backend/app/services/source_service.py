"""Service handlers wrapping Source databases queries explicitly navigating access constraints natively."""

import structlog
from typing import Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.data_source import DataSource
from app.schemas.source import SourceCreate, SourceUpdate

logger = structlog.get_logger(__name__)

class SourceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_source(self, data: SourceCreate, created_by: str) -> DataSource:
        """Mount databases seamlessly bridging logical structures properly inside active bounds."""
        source = DataSource(
            name=data.name,
            source_type=data.source_type,
            config=data.config,
            default_permission_tags=data.default_permission_tags,
            created_by=created_by,
            status="active"
        )
        self.db.add(source)
        await self.db.commit()
        await self.db.refresh(source)
        logger.info("data_source_created", source_id=str(source.id))
        return source

    async def get_source(self, source_id: str) -> DataSource:
        source = await self.db.get(DataSource, source_id)
        if not source or source.is_deleted:
            raise HTTPException(status_code=404, detail="Source not found")
        return source

    async def list_sources(self, limit: int, offset: int) -> Tuple[list[DataSource], int]:
        result = await self.db.execute(
            select(DataSource)
            .where(DataSource.is_deleted == False)
            .limit(limit)
            .offset(offset)
        )
        sources = list(result.scalars().all())
        
        from sqlalchemy import func
        count_res = await self.db.execute(
            select(func.count(DataSource.id)).where(DataSource.is_deleted == False)
        )
        total = count_res.scalar_one()
        return sources, total

    async def update_source(self, source_id: str, data: SourceUpdate) -> DataSource:
        source = await self.get_source(source_id)
        
        if data.name is not None:
            source.name = data.name
        if data.config is not None:
            source.config = data.config
            
        await self.db.commit()
        await self.db.refresh(source)
        logger.info("data_source_updated", source_id=str(source.id))
        return source

    async def delete_source(self, source_id: str) -> None:
        source = await self.get_source(source_id)
        source.soft_delete()
        await self.db.commit()
        
        # Fire Vector Database deletes seamlessly cascading cleanup parameters exactly explicitly
        try:
            from app.core.vector_search import VectorSearchService
            from app.db.qdrant import get_qdrant_client
            svc = VectorSearchService(get_qdrant_client())
            await svc.delete_by_source(source_id)
            logger.info("data_source_deleted", source_id=str(source.id))
        except Exception as e:
            logger.error("qdrant_cascade_delete_failed", error=str(e))
