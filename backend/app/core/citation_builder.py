"""Map retrieved chunks to API citation models."""

from __future__ import annotations

from datetime import UTC, datetime

from app.core.retrieval_types import RetrievedChunk
from app.schemas.query import Citation


class CitationBuilder:
    def build(self, chunks: list[RetrievedChunk]) -> list[Citation]:
        return [self._one(c) for c in chunks]

    def _one(self, chunk: RetrievedChunk) -> Citation:
        return Citation(
            title=chunk.document_title,
            source_type=chunk.source_type,
            source_url=chunk.source_url,
            author=chunk.author,
            timestamp=self._parse_timestamp(chunk.timestamp),
            relevance_score=chunk.score,
        )

    def _parse_timestamp(self, raw: str) -> datetime:
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return datetime.now(tz=UTC)
