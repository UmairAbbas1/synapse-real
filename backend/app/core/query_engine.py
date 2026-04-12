"""Full RAG query orchestration (SYNAPSE_MASTER_PROMPT.md Section 8)."""

from __future__ import annotations

import structlog

from app.config import settings
from app.core.citation_builder import CitationBuilder
from app.core.embedding import EmbeddingService
from app.core.expert_router import ExpertRouter
from app.core.graph_search import GraphSearchService
from app.core.llm_client import LLMClient
from app.core.prompt_builder import PromptBuilder
from app.core.retrieval_types import RetrievedChunk
from app.core.vector_search import VectorSearchService
from app.schemas.query import ExpertSuggestion, QueryMetadata, QueryResponse

logger = structlog.get_logger()


class QueryEngine:
    """
    Orchestrates the full RAG pipeline:
    1. Embed the query
    2. Vector search with RBAC filtering
    3. Graph enrichment (optional)
    4. Build context-augmented prompt
    5. LLM inference
    6. Format response with citations
    7. Expert routing if low confidence
    """

    def __init__(
        self,
        embedding_svc: EmbeddingService,
        vector_svc: VectorSearchService,
        graph_svc: GraphSearchService,
        llm_client: LLMClient,
        expert_router: ExpertRouter,
        prompt_builder: PromptBuilder,
        citation_builder: CitationBuilder,
    ) -> None:
        self.embedding = embedding_svc
        self.vector = vector_svc
        self.graph = graph_svc
        self.llm = llm_client
        self.expert = expert_router
        self.prompt = prompt_builder
        self.citation = citation_builder

    async def execute(
        self,
        query: str,
        user_permission_tags: list[str],
        user_id: str,
    ) -> QueryResponse:
        log = logger.bind(user_id=user_id, query_length=len(query))
        log.info("query_pipeline_started")

        # Step 1: Embed the query
        query_vector = self.embedding.encode(query)
        log.info("query_embedded", dimensions=len(query_vector))

        # Step 2: Vector search with RBAC filter
        chunks = await self.vector.search(
            vector=query_vector,
            permission_tags=user_permission_tags,
            top_k=settings.TOP_K_RESULTS,
        )
        log.info(
            "vector_search_complete",
            results=len(chunks),
            top_score=chunks[0].score if chunks else 0,
        )

        # Step 3: Check confidence threshold
        max_score = max((c.score for c in chunks), default=0.0)
        is_low_confidence = max_score < settings.SIMILARITY_THRESHOLD

        # Step 4: Graph enrichment
        graph_context: list[dict[str, object]] = []
        if chunks:
            graph_context = await self.graph.enrich(
                chunk_sources=[c.source_url for c in chunks],
                query_text=query,
            )
            log.info("graph_enrichment_complete", nodes=len(graph_context))

        # Step 5: Build prompt
        prompt = self.prompt.build(
            query=query,
            chunks=chunks,
            graph_context=graph_context,
            is_low_confidence=is_low_confidence,
        )

        # Step 6: LLM inference
        llm_response = await self.llm.generate(prompt)
        log.info("llm_inference_complete", response_length=len(llm_response))

        # Step 7: Build citations
        citations = self.citation.build(chunks)

        # Step 8: Expert routing (if needed)
        expert: ExpertSuggestion | None = None
        if is_low_confidence:
            expert = await self.expert.find_expert(query)
            log.info("expert_routed", expert=expert.name if expert else None)

        return QueryResponse(
            answer=llm_response,
            citations=citations,
            expert=expert,
            is_low_confidence=is_low_confidence,
            metadata=QueryMetadata(
                top_similarity_score=round(max_score, 4),
                chunks_retrieved=len(chunks),
                graph_nodes_used=len(graph_context),
                model=self.llm.model_name,
            ),
        )


__all__ = ["QueryEngine", "RetrievedChunk"]
