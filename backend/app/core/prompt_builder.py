"""Prompt generation service strictly aligned with master constraints."""

from typing import Protocol

import structlog

from app.core.vector_search import RetrievedChunk

logger = structlog.get_logger(__name__)


class _TokenEncoder(Protocol):
    def encode(self, text: str) -> list[int]:
        ...


try:
    import tiktoken

    _DEFAULT_ENCODER: _TokenEncoder | None = tiktoken.get_encoding("cl100k_base")
except Exception:  # pragma: no cover
    _DEFAULT_ENCODER = None


SYSTEM_PROMPT = """You are Synapse, an internal AI assistant for {company_name}. 
You answer questions ONLY using the provided context from internal company documents.

RULES:
1. ONLY use information from the provided context. Do not make up information.
2. If the context does not contain enough information, say so clearly.
3. Always reference which source document your answer comes from.
4. Be concise but thorough. Use bullet points for multi-step answers.
5. If the question is about code, format your answer with proper code blocks.
6. Never reveal sensitive information beyond what the context provides.
7. If you're unsure, say "Based on the available documents, I'm not fully confident..." 
"""

QUERY_PROMPT = """## Context from Internal Documents

{context_chunks}

## Related Graph Information
{graph_context}

## User Question
{user_query}

## Instructions
Answer the question using ONLY the context above. Cite your sources by referencing 
the document titles. If the context doesn't contain a clear answer, acknowledge 
the limitation and suggest who might know more.
"""

LOW_CONFIDENCE_ADDENDUM = """
NOTE: The search confidence for this query is low (score: {score}). 
The provided context may not be directly relevant. Please clearly 
indicate your uncertainty level in the response.
"""


class PromptBuilder:
    def __init__(self) -> None:
        self.encoder: _TokenEncoder | None = _DEFAULT_ENCODER
        self.max_tokens = 3000

    def _count_tokens(self, text: str) -> int:
        if self.encoder:
            return len(self.encoder.encode(text))
        # Fallback: approximate token count to keep prompts bounded even if
        # optional tokenizer dependency isn't installed in the container image.
        return max(1, len(text) // 4)

    def build(
        self,
        query: str,
        chunks: list[RetrievedChunk],
        graph_context: list[dict[str, object]],
        is_low_confidence: bool,
        company_name: str = "the company",
    ) -> tuple[str, str]:
        """
        Assemble the System and User prompt tuples enforcing max token size capabilities.
        """
        system_prompt = SYSTEM_PROMPT.format(company_name=company_name)
        
        # Extract graph mappings
        graph_lines = []
        for g in graph_context:
            raw_p = g.get("projects")
            raw_a = g.get("authors")
            proj_list = raw_p if isinstance(raw_p, list) else []
            auth_list = raw_a if isinstance(raw_a, list) else []
            projects = ", ".join(str(x) for x in proj_list if x)
            authors = ", ".join(str(x) for x in auth_list if x)
            if projects or authors:
                graph_lines.append(f"Related: {projects}, Authors: {authors}")
        graph_text = "\n".join(graph_lines) if graph_lines else "None"

        score = round(chunks[0].similarity, 2) if chunks else 0.0
        
        addendum = ""
        if is_low_confidence:
            addendum = LOW_CONFIDENCE_ADDENDUM.format(score=score)
            
        user_query_fin = query + addendum
        
        # Build baseline to deduct foundational tokens efficiently
        base_user_prompt = QUERY_PROMPT.format(
            context_chunks="",
            graph_context=graph_text,
            user_query=user_query_fin,
        )
        
        base_tokens = self._count_tokens(system_prompt) + self._count_tokens(base_user_prompt)
        available_tokens = self.max_tokens - base_tokens
        
        # Safely compile available document contexts iteratively to avoid breaking boundaries
        formatted_chunks = []
        for chunk in chunks:
            title_hint = chunk.source_url or chunk.chunk_id
            chunk_str = (
                f"Source: {title_hint} ({chunk.doc_type}) by {chunk.author}\n"
                f"{chunk.chunk_text}\n---"
            )
            chunk_tokens = self._count_tokens(chunk_str)
            
            if available_tokens - chunk_tokens > 0:
                formatted_chunks.append(chunk_str)
                available_tokens -= chunk_tokens
            else:
                break
                
        final_context = "\n\n".join(formatted_chunks)
        user_prompt = QUERY_PROMPT.format(
            context_chunks=final_context,
            graph_context=graph_text,
            user_query=user_query_fin,
        )
        
        total_tokens = self._count_tokens(system_prompt) + self._count_tokens(user_prompt)
        
        logger.info(
            "prompt_built",
            chunks_used=len(formatted_chunks),
            total_chunks_provided=len(chunks),
            total_tokens=total_tokens,
        )
        
        return system_prompt, user_prompt
