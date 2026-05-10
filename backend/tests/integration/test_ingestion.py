from __future__ import annotations

import pytest

from app.core.chunker import chunk_document
from app.core.vector_search import VectorSearchService
from tests.factories import DataSourceFactory


@pytest.mark.asyncio
async def test_ingestion_chunk_embed_store_pipeline(monkeypatch: pytest.MonkeyPatch) -> None:
    source = DataSourceFactory(source_type="slack", status="active")
    assert source["status"] == "active"

    text = "Troubleshooting guide. " * 200
    chunks = chunk_document(text, chunk_size=80, overlap=10)
    assert len(chunks) >= 2

    vectors = [[0.01] * 768 for _ in chunks]
    assert len(vectors) == len(chunks)

    upserted: list[list[dict[str, object]]] = []

    async def fake_upsert(self: VectorSearchService, rows: list[dict[str, object]]) -> None:
        upserted.append(rows)

    monkeypatch.setattr(VectorSearchService, "upsert_chunks", fake_upsert)

    service = VectorSearchService()
    rows = []
    for idx, chunk in enumerate(chunks):
        rows.append(
            {
                "id": str(idx + 1),
                "chunk_text": chunk.text,
                "source_url": "https://example.com/doc",
                "doc_type": str(source["source_type"]),
                "author": "user@company.com",
                "timestamp": "2026-01-01T00:00:00Z",
                "permission_tag": "engineering",
                "embedding": str(vectors[idx]),
            }
        )

    await service.upsert_chunks(rows)
    assert len(upserted) == 1
    assert len(upserted[0]) == len(chunks)
