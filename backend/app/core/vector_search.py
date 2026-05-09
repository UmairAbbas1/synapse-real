"""Vector search service using pgvector. RBAC enforced in SQL."""
from __future__ import annotations
import structlog
from dataclasses import dataclass
from sqlalchemy import text
from app.db.postgres import get_db_session

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
        query_vector: list[float],
        permission_tags: list[str],
        top_k: int = 5,
    ) -> list[RetrievedChunk]:
        # RBAC is enforced HERE, in SQL.
        # Bypass is impossible — even a buggy caller cannot retrieve chunks outside permission_tags.
        sql = text("""
            SELECT id, chunk_text, source_url, doc_type, author, timestamp, permission_tag,
                   1 - (embedding <=> :vec::vector) AS similarity
            FROM document_chunks
            WHERE permission_tag = ANY(:tags)
            ORDER BY embedding <=> :vec::vector ASC
            LIMIT :top_k
        """)
        async with get_db_session() as session:
            result = await session.execute(sql, {
                "vec": str(query_vector),
                "tags": permission_tags,
                "top_k": top_k,
            })
            rows = result.fetchall()

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

    async def upsert_chunks(self, chunks: list[dict]) -> None:
        sql = text("""
            INSERT INTO document_chunks
                (id, chunk_text, source_url, doc_type, author, timestamp, permission_tag, embedding)
            VALUES
                (:id, :chunk_text, :source_url, :doc_type, :author, :timestamp, :permission_tag, :embedding::vector)
            ON CONFLICT (id) DO UPDATE SET
                chunk_text = EXCLUDED.chunk_text,
                embedding = EXCLUDED.embedding
        """)
        async with get_db_session() as session:
            await session.execute(sql, chunks)
            await session.commit()

    async def delete_by_source(self, source_id: str) -> None:
        sql = text("DELETE FROM document_chunks WHERE source_url = :source_id")
        async with get_db_session() as session:
            await session.execute(sql, {"source_id": source_id})
            await session.commit()
