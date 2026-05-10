"""Celery ingestion task — loads connector, chunks, embeds, upserts pgvector."""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from typing import cast

import structlog
from celery.exceptions import MaxRetriesExceededError
from sqlalchemy import update

from app.connectors.base import RawDocument
from app.connectors.registry import get_connector
from app.core.chunker import chunk_document
from app.core.crypto import decrypt_credentials_from_config
from app.core.embedding import EmbeddingService, load_embedding_model
from app.core.graph_search import GraphSearchService
from app.core.vector_search import VectorSearchService
from app.db.neo4j import get_neo4j_driver
from app.db.postgres import get_async_session_factory
from app.models.data_source import DataSource
from app.models.ingestion_job import IngestionJob
from app.workers.celery_app import celery_app

logger = structlog.get_logger(__name__)


async def _fail_job(jid: str, err: str) -> None:
    factory = get_async_session_factory()
    async with factory() as session:
        await session.execute(
            update(IngestionJob)
            .where(IngestionJob.id == uuid.UUID(jid))
            .values(
                status="failed",
                error_message=err,
                completed_at=datetime.now(timezone.utc),
            )
        )
        await session.commit()


async def _pipeline(source_id: str, job_id: str | None) -> dict[str, object]:
    load_embedding_model()
    embed_svc = EmbeddingService()
    vec_svc = VectorSearchService()
    graph_svc = GraphSearchService(get_neo4j_driver())

    factory = get_async_session_factory()
    async with factory() as session:
        row = await session.get(DataSource, uuid.UUID(source_id))
        if not row or row.is_deleted:
            raise ValueError("Source not found")

        cfg = dict(row.config or {})
        credentials = decrypt_credentials_from_config(cfg)
        merged = dict(credentials)
        if cfg.get("sync_schedule"):
            merged.setdefault("_sync_schedule", cfg.get("sync_schedule"))

        connector = get_connector(row.source_type, merged)

        final_job_id = job_id or str(uuid.uuid4())
        if job_id is None:
            session.add(
                IngestionJob(
                    id=uuid.UUID(final_job_id),
                    source_id=uuid.UUID(source_id),
                    status="running",
                    started_at=datetime.now(timezone.utc),
                )
            )
            await session.commit()
        else:
            await session.execute(
                update(IngestionJob)
                .where(IngestionJob.id == uuid.UUID(job_id))
                .values(status="running", started_at=datetime.now(timezone.utc))
            )
            await session.commit()

    await connector.authenticate()

    docs_processed = 0
    chunks_total = 0

    async with factory() as session:
        ds = await session.get(DataSource, uuid.UUID(source_id))
        perm_tag = (ds.default_permission_tags or ["engineering"])[0] if ds else "engineering"

    doc_iter = connector.fetch_documents()
    async for doc in cast(AsyncIterator[RawDocument], doc_iter):
        chunks = chunk_document(doc.content, chunk_size=512, overlap=50)
        texts = [c.text for c in chunks]
        vectors = embed_svc.encode_batch(texts) if texts else []

        upsert_rows: list[dict[str, object]] = []
        for i, ch in enumerate(chunks):
            cid = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{doc.source_url}-{ch.chunk_index}"))
            upsert_rows.append(
                {
                    "id": cid,
                    "chunk_text": ch.text,
                    "source_url": doc.source_url,
                    "doc_type": doc.doc_type,
                    "author": doc.author_email,
                    "timestamp": doc.timestamp.isoformat(),
                    "permission_tag": doc.permission_tag or perm_tag,
                    "embedding": str(vectors[i]),
                }
            )

        if upsert_rows:
            await vec_svc.upsert_chunks(upsert_rows)

        await graph_svc.update_graph(doc)

        docs_processed += 1
        chunks_total += len(chunks)

        if docs_processed % 50 == 0:
            async with factory() as session:
                await session.execute(
                    update(IngestionJob)
                    .where(IngestionJob.id == uuid.UUID(final_job_id))
                    .values(documents_processed=docs_processed, chunks_processed=chunks_total)
                )
                await session.commit()

    async with factory() as session:
        await session.execute(
            update(IngestionJob)
            .where(IngestionJob.id == uuid.UUID(final_job_id))
            .values(
                status="completed",
                documents_processed=docs_processed,
                chunks_processed=chunks_total,
                completed_at=datetime.now(timezone.utc),
            )
        )
        await session.commit()

    return {"job_id": final_job_id, "documents": docs_processed, "chunks": chunks_total}


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def ingest_source(self, source_id: str, job_id: str | None = None) -> dict[str, object]:
    try:
        return asyncio.run(_pipeline(source_id, job_id))
    except Exception as exc:
        logger.error("ingest_failed", source_id=source_id, job_id=job_id, error=str(exc))
        try:
            raise self.retry(exc=exc, countdown=60 * (2**self.request.retries))
        except MaxRetriesExceededError:
            if job_id is not None:
                asyncio.run(_fail_job(job_id, str(exc)))
            raise exc from None
