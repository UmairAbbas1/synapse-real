"""Shared retrieval types for the RAG pipeline (Section 8)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class RetrievedChunk:
    """Single chunk from vector search with RBAC-scoped metadata."""

    text: str
    score: float
    source_url: str
    source_type: str
    document_title: str
    author: str
    timestamp: str
