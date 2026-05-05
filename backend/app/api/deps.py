"""API-scoped dependencies for route handlers."""

from __future__ import annotations

from fastapi import Request

from app.core.query_engine import QueryEngine


def get_query_engine(request: Request) -> QueryEngine:
    """Return the initialized QueryEngine from application state."""
    return QueryEngine(
        embedding_svc=request.app.state.embedding_svc,
        vector_svc=request.app.state.vector_svc,
        graph_svc=request.app.state.graph_svc,
        llm_client=request.app.state.llm_client,
        expert_router=request.app.state.expert_router,
        prompt_builder=request.app.state.prompt_builder,
        citation_builder=request.app.state.citation_builder,
    )
