"""LLM prompt construction from retrieval and graph context."""

from __future__ import annotations

from app.core.retrieval_types import RetrievedChunk


class PromptBuilder:
    def build(
        self,
        query: str,
        chunks: list[RetrievedChunk],
        graph_context: list[dict[str, object]],
        is_low_confidence: bool,
    ) -> str:
        """Assemble context-augmented prompt for the local LLM."""
        parts: list[str] = [
            "You are Synapse, an enterprise assistant. Answer using ONLY the context.",
            "",
            f"User question: {query}",
            "",
            "Retrieved context:",
        ]
        for i, chunk in enumerate(chunks, start=1):
            parts.append(
                f"[{i}] ({chunk.source_type}) {chunk.document_title} — {chunk.text}"
            )
        if graph_context:
            parts.append("")
            parts.append("Knowledge graph context:")
            for row in graph_context:
                parts.append(str(row))
        if is_low_confidence:
            parts.append("")
            parts.append(
                "Warning: retrieval confidence is low. Say if you are uncertain "
                "and avoid inventing facts."
            )
        parts.append("")
        parts.append("Answer:")
        return "\n".join(parts)
