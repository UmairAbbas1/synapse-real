"""Vector search service using pgvector. RBAC enforced in SQL."""
from __future__ import annotations
import structlog
from dataclasses import dataclass
from sqlalchemy import text
from app.db.postgres import get_async_session_factory

logger = structlog.get_logger(__name__)

@dataclass
class RetrievedChunk:
    chunk_id: str
    chunk_text: str
    source_url: str
    doc_type: str
    author: str
    timestamp: str
    permission_tag: str
    similarity: float

class VectorSearchService:
    def __init__(self) -> None:
        pass

    async def search(
        self,
        *,
        query_vector: list[float],
        permission_tags: list[str],
        top_k: int = 5,
    ) -> list[RetrievedChunk]:
        if not query_vector:
            raise ValueError("query_vector is required")

        # RBAC is enforced HERE, in SQL.
        # '*' denotes full corpus access for privileged roles (expanded from JWT permissions).
        wildcard = "*" in permission_tags
        if wildcard:
            sql = text("""
                SELECT id, chunk_text, source_url, doc_type, author, timestamp, permission_tag,
                       1 - (embedding <=> CAST(:vec AS vector)) AS similarity
                FROM document_chunks
                ORDER BY embedding <=> CAST(:vec AS vector) ASC
                LIMIT :top_k
            """)
            params: dict[str, object] = {
                "vec": str(query_vector),
                "top_k": top_k,
            }
        else:
            sql = text("""
                SELECT id, chunk_text, source_url, doc_type, author, timestamp, permission_tag,
                       1 - (embedding <=> CAST(:vec AS vector)) AS similarity
                FROM document_chunks
                WHERE permission_tag = ANY(:tags)
                ORDER BY embedding <=> CAST(:vec AS vector) ASC
                LIMIT :top_k
            """)
            params = {
                "vec": str(query_vector),
                "tags": permission_tags,
                "top_k": top_k,
            }
        factory = get_async_session_factory()
        async with factory() as session:
            try:
                result = await session.execute(sql, params)
                rows = result.fetchall()
            except Exception as exc:
                logger.warning("vector_search_fallback_empty", error=str(exc))
                return []

        return [
            RetrievedChunk(
                chunk_id=str(row.id),
                chunk_text=row.chunk_text,
                source_url=row.source_url or "",
                doc_type=row.doc_type or "",
                author=row.author or "",
                timestamp=str(row.timestamp or ""),
                permission_tag=row.permission_tag or "",
                similarity=float(row.similarity),
            )
            for row in rows
        ]

    async def upsert_chunks(self, chunks: list[dict[str, object]]) -> None:
        sql = text("""
            INSERT INTO document_chunks
                (id, chunk_text, source_url, doc_type, author, timestamp, permission_tag, embedding)
            VALUES
                (:id, :chunk_text, :source_url, :doc_type, :author, :timestamp, :permission_tag, CAST(:embedding AS vector))
            ON CONFLICT (id) DO UPDATE SET
                chunk_text = EXCLUDED.chunk_text,
                embedding = EXCLUDED.embedding
        """)
        factory = get_async_session_factory()
        async with factory() as session:
            for row in chunks:
                await session.execute(sql, row)
            await session.commit()

    async def delete_by_source(self, source_id: str) -> None:
        sql = text("DELETE FROM document_chunks WHERE source_url = :source_id")
        factory = get_async_session_factory()
        async with factory() as session:
            await session.execute(sql, {"source_id": source_id})
            await session.commit()
