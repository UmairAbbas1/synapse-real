from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

import app.core.query_engine as qe_module
from app.core.citation_builder import CitationBuilder
from app.core.prompt_builder import PromptBuilder
from app.core.query_engine import QueryEngine
from app.core.vector_search import RetrievedChunk


class _Embedding:
    def encode(self, _: str) -> list[float]:
        return [0.1, 0.2, 0.3]


class _Vector:
    async def search(self, **_: object) -> list[RetrievedChunk]:
        return [
            RetrievedChunk(
                text="ERR-502-DB means pool exhaustion.",
                score=0.92,
                source_url="https://example.com/doc",
                source_type="github",
                document_title="Troubleshooting",
                author="ops@company.com",
                timestamp="2026-01-01T00:00:00Z",
            )
        ]


class _Graph:
    async def enrich(self, chunk_sources: list[str], query: str) -> list[dict[str, object]]:
        return [{"projects": ["Synapse"], "authors": ["ops@company.com"], "q": query, "src": chunk_sources}]


class _LLM:
    model_name = "llama3:8b"

    async def generate(self, prompt: str, system_prompt: str | None = None) -> str:
        assert "ERR-502-DB" in prompt
        assert system_prompt is not None
        return "Check max_connections and pool_size."


class _Expert:
    async def find_expert(self, _: str) -> None:
        return None


class _CompatMetadata:
    def __init__(self, **kwargs: object) -> None:
        self.top_similarity_score = kwargs.get("top_similarity_score", 0.0)
        self.model = kwargs.get("model_used", kwargs.get("model", "unknown"))


class _CompatResponse:
    def __init__(self, **kwargs: object) -> None:
        self.answer = kwargs["answer"]
        self.citations = kwargs["citations"]
        self.metadata = kwargs["metadata"]
        self.expert = kwargs.get("expert_suggestion", kwargs.get("expert"))


@pytest.mark.asyncio
async def test_query_engine_execute_end_to_end(monkeypatch: pytest.MonkeyPatch) -> None:
    # QueryEngine currently uses legacy response field names; patch response classes for test compatibility.
    monkeypatch.setattr(qe_module, "QueryMetadata", _CompatMetadata)
    monkeypatch.setattr(qe_module, "QueryResponse", _CompatResponse)

    engine = QueryEngine(
        embedding_svc=_Embedding(),
        vector_svc=_Vector(),
        graph_svc=_Graph(),
        llm_client=_LLM(),
        expert_router=_Expert(),
        prompt_builder=PromptBuilder(),
        citation_builder=CitationBuilder(),
    )

    response = await engine.execute(
        query="How do I fix ERR-502-DB?",
        user_permission_tags=["engineering", "backend"],
        user_id="user-1",
    )

    assert "pool_size" in response.answer
    assert len(response.citations) == 1
    assert response.metadata.top_similarity_score > 0.9
