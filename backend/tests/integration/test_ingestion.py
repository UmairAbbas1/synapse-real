from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from app.core.chunker import chunk_document
from app.core.vector_search import VectorSearchService
from tests.factories import DataSourceFactory


@pytest.mark.asyncio
async def test_ingestion_chunk_embed_store_pipeline(monkeypatch: pytest.MonkeyPatch) -> None:
    source = DataSourceFactory(source_type="slack", status="active")
    assert source["status"] == "active"

    # 1) Chunk
    text = "Troubleshooting guide. " * 200
    chunks = chunk_document(text, chunk_size=80, overlap=10)
    assert len(chunks) >= 2

    # 2) Embed (mock)
    vectors = [[0.01] * 768 for _ in chunks]
    assert len(vectors) == len(chunks)

    # 3) Store in Qdrant (mock async client)
    mock_client = AsyncMock()
    service = VectorSearchService(mock_client)

    points = []
    for idx, chunk in enumerate(chunks):
        points.append(
            {
                "id": idx + 1,
                "vector": vectors[idx],
                "payload": {
                    "chunk_text": chunk.text,
                    "source_id": "source-1",
                    "source_type": source["source_type"],
                    "source_url": "https://example.com/doc",
                    "document_title": "Test Document",
                    "author": "user@company.com",
                    "timestamp": "2026-01-01T00:00:00Z",
                    "permission_tags": ["engineering"],
                },
            }
        )

    await service.upsert_chunks(points)
    mock_client.upsert.assert_awaited_once()
