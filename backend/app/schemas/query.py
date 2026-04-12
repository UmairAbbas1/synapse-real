"""Query / RAG API schemas (SYNAPSE_MASTER_PROMPT.md Section 8 & 12)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=3,
        max_length=2000,
        description="Natural language question",
    )


class Citation(BaseModel):
    title: str
    source_type: str
    source_url: str
    author: str
    timestamp: datetime
    relevance_score: float


class ExpertSuggestion(BaseModel):
    name: str
    email: str
    job_title: str
    relevance_score: int


class QueryMetadata(BaseModel):
    top_similarity_score: float
    chunks_retrieved: int
    graph_nodes_used: int
    model: str


class QueryResponse(BaseModel):
    answer: str
    citations: list[Citation]
    expert: ExpertSuggestion | None = None
    is_low_confidence: bool
    metadata: QueryMetadata
