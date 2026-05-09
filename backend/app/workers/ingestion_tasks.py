"""Celery ingestion workers executing massive RAG pipelines synchronously across async components natively."""

import asyncio
import structlog
import uuid
from datetime import datetime, timezone
from celery import shared_task
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

# Dynamic components loading inside logic execution strictly mapping paths efficiently
from app.connectors.registry import get_connector
from app.core.chunker import chunk_document
from app.core.embedding import EmbeddingService, load_embedding_model
from app.core.vector_search import VectorSearchService
from app.core.graph_search import GraphSearchService
from app.models.ingestion_job import IngestionJob

logger = structlog.get_logger(__name__)


# Assume internal dependency fetchers exist inherently based out of prior infrastructure routes
def get_sync_db_session_marker():
    from app.db.postgres import get_async_session_factory
    return get_async_session_factory()

# removed: was qdrant, now using pgvector

def get_neo4j():
    from app.db.neo4j import get_neo4j_driver
    return get_neo4j_driver()


async def _update_job_progress(job_id: str, docs: int, chunks: int):
    SessionMaker = get_sync_db_session_marker()
    async with SessionMaker() as session:
        stmt = update(IngestionJob).where(IngestionJob.id == job_id).values(
            documents_processed=docs,
            chunks_processed=chunks
        )
        await session.execute(stmt)
        await session.commit()

async def _complete_job(job_id: str):
    SessionMaker = get_sync_db_session_marker()
    async with SessionMaker() as session:
        stmt = update(IngestionJob).where(IngestionJob.id == job_id).values(
            status="completed",
            completed_at=datetime.now(timezone.utc)
        )
        await session.execute(stmt)
        await session.commit()

async def _fail_job(job_id: str, error: str):
    SessionMaker = get_sync_db_session_marker()
    async with SessionMaker() as session:
        stmt = update(IngestionJob).where(IngestionJob.id == job_id).values(
            status="failed",
            error_message=error,
            completed_at=datetime.now(timezone.utc)
        )
        await session.execute(stmt)
        await session.commit()

async def _async_ingest_pipeline(source_id: str, job_id: str):
    load_embedding_model()
    embedding_svc = EmbeddingService()
    vector_svc = VectorSearchService()
    graph_svc = GraphSearchService(get_neo4j())
    
    docs_processed = 0
    chunks_processed = 0
    
    SessionMaker = get_sync_db_session_marker()
    try:
        async with SessionMaker() as db:
            connector = await get_connector(source_id, db)
            
        async for doc in connector.fetch_documents():
            chunks = chunk_document(doc.content)
            
            texts = [c.text for c in chunks]
            vectors = embedding_svc.encode_batch(texts) if texts else []
            
            points = []
            for i, c in enumerate(chunks):
                # Generates strict UUID structures converting string bounds logically ensuring DB consistency
                safe_point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{doc.source_id}-{c.chunk_index}"))
                points.append({
                    "id": safe_point_id,
                    "vector": vectors[i],
                    "payload": {
                        "chunk_text": c.text,
                        "source_id": doc.source_id,
                        "source_type": doc.source_type,
                        "source_url": doc.source_url,
                        "document_title": doc.title,
                        "author": doc.author_name,
                        "timestamp": doc.updated_at,
                        "permission_tags": doc.permission_tags
                    }
                })
            
            if points:
                await vector_svc.upsert_chunks(points)
                
            await graph_svc.update_graph(doc)
            
            docs_processed += 1
            chunks_processed += len(chunks)
            if docs_processed % 10 == 0:
                await _update_job_progress(job_id, docs_processed, chunks_processed)
                
        await _complete_job(job_id)
        
    except Exception as e:
        logger.error("ingestion_task_failed", error=str(e), source_id=source_id)
        await _fail_job(job_id, str(e))
        raise e


@shared_task(bind=True, max_retries=3, default_retry_delay=60, retry_backoff=True, acks_late=True, reject_on_worker_lost=True)
def ingest_source(self, source_id: str, job_id: str):
    """Execution route bridging explicitly wrapped internal async processes natively outwards."""
    try:
        asyncio.run(_async_ingest_pipeline(source_id, job_id))
    except Exception as exc:
        raise self.retry(exc=exc)
