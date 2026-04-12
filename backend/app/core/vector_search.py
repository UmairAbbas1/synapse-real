"""Vector search service with structural RBAC."""

from __future__ import annotations

import structlog
from dataclasses import dataclass
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchAny, MatchValue, PointStruct

from app.config import settings

logger = structlog.get_logger(__name__)


@dataclass
class RetrievedChunk:
    text: str
    score: float
    source_url: str
    source_type: str
    document_title: str
    author: str
    timestamp: str


class VectorSearchService:
    def __init__(self, client: AsyncQdrantClient):
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
        log = logger.bind(top_k=top_k)
        
        if not permission_tags:
            log.warning("search_rejected_no_permissions")
            return []

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
        
        if results:
            log.info(
                "vector_search_complete",
                results_count=len(results),
                top_score=results[0].score,
            )
        else:
            log.info("vector_search_complete", results_count=0, top_score=0.0)
        
        return [
            RetrievedChunk(
                text=hit.payload.get("chunk_text", "") if hit.payload else "",
                score=hit.score,
                source_url=hit.payload.get("source_url", "") if hit.payload else "",
                source_type=hit.payload.get("source_type", "") if hit.payload else "",
                document_title=hit.payload.get("document_title", "") if hit.payload else "",
                author=hit.payload.get("author", "") if hit.payload else "",
                timestamp=hit.payload.get("timestamp", "") if hit.payload else "",
            )
            for hit in results
        ]

    async def upsert_chunks(self, points: list[dict]) -> None:
        """Upsert vectors into Qdrant for ingestion pipeline."""
        if not points:
            return
            
        qdrant_points = [
            PointStruct(
                id=p["id"],
                vector=p["vector"],
                payload=p["payload"]
            )
            for p in points
        ]
        
        await self.client.upsert(
            collection_name=self.collection,
            points=qdrant_points
        )
        logger.info("vector_upsert_complete", points_count=len(points))

    async def delete_by_source(self, source_id: str) -> None:
        """Delete all chunks related to a specific source."""
        source_filter = Filter(
            must=[
                FieldCondition(
                    key="source_id",
                    match=MatchValue(value=source_id),
                )
            ]
        )
        await self.client.delete(
            collection_name=self.collection,
            points_selector=source_filter,
        )
        logger.info("vector_delete_by_source_complete", source_id=source_id)
