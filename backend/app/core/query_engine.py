"""Comprehensive RAG pipeline orchestrator mapping vector and graph connections."""

from __future__ import annotations

import json
import structlog
from collections.abc import AsyncIterator

from app.core.citation_builder import CitationBuilder
from app.core.embedding import EmbeddingService
from app.core.expert_router import ExpertRouter
from app.core.graph_search import GraphSearchService
from app.core.llm_client import LLMClient, LLMUnavailableError
from app.core.prompt_builder import PromptBuilder
from app.core.vector_search import VectorSearchService
from app.schemas.query import QueryMetadata, QueryResponse

logger = structlog.get_logger(__name__)


class QueryEngine:
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
        self.embedding_svc = embedding_svc
        self.vector_svc = vector_svc
        self.graph_svc = graph_svc
        self.llm_client = llm_client
        self.expert_router = expert_router
        self.prompt_builder = prompt_builder
        self.citation_builder = citation_builder

    async def execute(self, query: str, user_permission_tags: list[str], user_id: str) -> QueryResponse:
        log = logger.bind(user_id=user_id)

        vector = self.embedding_svc.embed(query)
        log.info("query_step_1_embed_complete", vector_dim=len(vector))

        chunks = await self.vector_svc.search(
            query_vector=vector,
            permission_tags=user_permission_tags,
            top_k=5,
        )
        log.info("query_step_2_vector_search_complete", chunks_retrieved=len(chunks))

        max_sim = max((c.similarity for c in chunks), default=0.0)
        low_confidence = len(chunks) == 0 or max_sim < 0.3
        log.info(
            "query_step_3_confidence_check",
            top_score=max_sim,
            low_confidence=low_confidence,
        )

        graph_context = await self.graph_svc.enrich(query, chunks)
        log.info("query_step_4_graph_enrichment_complete", graph_nodes=len(graph_context))

        system_prompt, user_prompt = self.prompt_builder.build(
            query=query,
            chunks=chunks,
            graph_context=graph_context,
            is_low_confidence=low_confidence,
        )
        log.info("query_step_5_prompt_built")

        answer = ""
        llm_failed = False
        try:
            answer = await self.llm_client.generate(prompt=user_prompt, system_prompt=system_prompt)
            log.info("query_step_6_llm_inference_complete", answer_length=len(answer))
        except LLMUnavailableError:
            log.warning("query_step_6_llm_unavailable")
            answer = ""
            llm_failed = True

        citations = self.citation_builder.build(chunks)
        log.info("query_step_7_citations_built", citation_count=len(citations))

        expert = None
        if low_confidence and not llm_failed:
            expert = await self.expert_router.find_expert(query)
        log.info("query_step_8_expert_routing_complete", expert_found=expert is not None)

        metadata = QueryMetadata(
            top_similarity_score=max_sim,
            chunks_retrieved=len(chunks),
            graph_nodes_used=len(graph_context),
            model=self.llm_client.model_name,
        )

        return QueryResponse(
            answer=answer,
            citations=citations,
            expert=expert,
            is_low_confidence=low_confidence,
            metadata=metadata,
        )

    async def execute_stream(
        self,
        query: str,
        user_permission_tags: list[str],
        user_id: str,
    ) -> AsyncIterator[str]:
        log = logger.bind(user_id=user_id)

        vector = self.embedding_svc.embed(query)
        chunks = await self.vector_svc.search(
            query_vector=vector,
            permission_tags=user_permission_tags,
            top_k=5,
        )

        max_sim = max((c.similarity for c in chunks), default=0.0)
        low_confidence = len(chunks) == 0 or max_sim < 0.3

        graph_context = await self.graph_svc.enrich(query, chunks)

        system_prompt, user_prompt = self.prompt_builder.build(
            query=query,
            chunks=chunks,
            graph_context=graph_context,
            is_low_confidence=low_confidence,
        )

        yield f"data: {json.dumps({'type': 'retrieval_done', 'chunk_count': len(chunks)})}\n\n"

        try:
            async for token in self.llm_client.generate_stream(user_prompt, system_prompt):
                yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"
        except LLMUnavailableError:
            log.warning("query_stream_llm_unavailable")
            yield f"data: {json.dumps({'type': 'error', 'message': 'LLM unavailable'})}\n\n"
            return

        citations = self.citation_builder.build(chunks)
        expert = None
        if low_confidence:
            expert = await self.expert_router.find_expert(query)

        citations_payload = [c.model_dump(mode="json") for c in citations]
        expert_payload = expert.model_dump(mode="json") if expert else None

        complete_payload: dict[str, object] = {
            "type": "complete",
            "citations": citations_payload,
            "expert": expert_payload,
            "confidence": max_sim,
        }
        yield f"data: {json.dumps(complete_payload)}\n\n"
