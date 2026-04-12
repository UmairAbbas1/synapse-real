"""Qdrant vector search with RBAC payload filtering (Section 8)."""

from __future__ import annotations

import structlog
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import FieldCondition, Filter, MatchAny

from app.config import settings
from app.core.retrieval_types import RetrievedChunk

logger = structlog.get_logger()


class VectorSearchService:
    def __init__(self, client: AsyncQdrantClient) -> None:
        self.client = client
        self.collection = settings.QDRANT_COLLECTION

    async def search(
        self,
        vector: list[float],
        permission_tags: list[str],
        top_k: int = 5,
    ) -> list[RetrievedChunk]:
        """
        CRITICAL: RBAC filter is applied AT THE DATABASE LEVEL.
        The search space is physically restricted to only chunks
        the user is permitted to access. Bypass is architecturally
        impossible — the filter is part of the query itself.
        """
        rbac_filter = Filter(
            must=[
                FieldCondition(
                    key="permission_tags",
                    match=MatchAny(any=permission_tags),
                )
            ]
        )

        results = await self.client.search(
            collection_name=self.collection,
            query_vector=vector,
            query_filter=rbac_filter,
            limit=top_k,
            with_payload=True,
            score_threshold=0.3,
        )

        chunks: list[RetrievedChunk] = []
        for hit in results:
            payload = hit.payload or {}
            try:
                chunks.append(
                    RetrievedChunk(
                        text=str(payload["chunk_text"]),
                        score=float(hit.score),
                        source_url=str(payload["source_url"]),
                        source_type=str(payload["source_type"]),
                        document_title=str(payload["document_title"]),
                        author=str(payload["author"]),
                        timestamp=str(payload["timestamp"]),
                    )
                )
            except KeyError as exc:
                logger.warning(
                    "vector_hit_missing_payload_field",
                    error=str(exc),
                    point_id=getattr(hit, "id", None),
                )
        return chunks
