"""Comprehensive RAG pipeline orchestrator mapping vector and graph connections."""

import structlog
from app.core.embedding import EmbeddingService
from app.core.vector_search import VectorSearchService
from app.core.graph_search import GraphSearchService
from app.core.llm_client import LLMClient
from app.core.expert_router import ExpertRouter
from app.core.prompt_builder import PromptBuilder
from app.core.citation_builder import CitationBuilder
from app.schemas.query import QueryResponse, QueryMetadata
from app.api.middleware.error_handler import LLMUnavailableError, VectorDBError

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
        citation_builder: CitationBuilder
    ):
        self.embedding_svc = embedding_svc
        self.vector_svc = vector_svc
        self.graph_svc = graph_svc
        self.llm_client = llm_client
        self.expert_router = expert_router
        self.prompt_builder = prompt_builder
        self.citation_builder = citation_builder

    async def execute(self, query: str, user_permission_tags: list[str], user_id: str) -> QueryResponse:
        log = logger.bind(user_id=user_id)
        
        # Step 1: Embed query efficiently
        vector = self.embedding_svc.encode(query)
        log.info("query_step_1_embed_complete", vector_dim=len(vector))
        
        # Step 2: Extract top vectors natively guarding explicitly through RBAC mappings
        try:
            chunks = await self.vector_svc.search(
                vector=vector, 
                permission_tags=user_permission_tags, 
                top_k=5
            )
        except Exception as e:
            log.error("vector_search_crashed", error=str(e))
            raise VectorDBError()
            
        log.info("query_step_2_vector_search_complete", chunks_retrieved=len(chunks))
        
        # Step 3: Grade local query matching thresholds accurately mapping logic
        top_score = chunks[0].score if chunks else 0.0
        is_low_confidence = top_score < 0.65
        log.info("query_step_3_confidence_check", top_score=top_score, low_confidence=is_low_confidence)
        
        # Step 4: Expand exact document nodes backwards towards internal architecture relations 
        graph_context = []
        if chunks:
            chunk_sources = list({c.source_url for c in chunks if c.source_url})
            graph_context = await self.graph_svc.enrich(chunk_sources, query)
        log.info("query_step_4_graph_enrichment_complete", graph_nodes=len(graph_context))
        
        # Step 5: Format token bounds precisely compiling context variables
        system_prompt, user_prompt = self.prompt_builder.build(
            query=query,
            chunks=chunks,
            graph_context=graph_context,
            is_low_confidence=is_low_confidence
        )
        log.info("query_step_5_prompt_built")
        
        # Step 6: Offload logic queries remotely
        # Will inherently raise LLMUnavailableError internally upon faults
        answer = await self.llm_client.generate(prompt=user_prompt, system_prompt=system_prompt)
        log.info("query_step_6_llm_inference_complete", answer_length=len(answer))
        
        # Step 7: Deduplicate internal contexts building out standard reference logic
        citations = self.citation_builder.build(chunks)
        log.info("query_step_7_citations_built", citation_count=len(citations))
        
        # Step 8: Calculate internal fallback logic safely mapping users logically backwards towards specialized devs
        expert = None
        if is_low_confidence:
            expert = await self.expert_router.find_expert(query)
        log.info("query_step_8_expert_routing_complete", expert_found=expert is not None)
        
        metadata = QueryMetadata(
            top_similarity_score=top_score,
            chunks_retrieved=len(chunks),
            graph_nodes_used=len(graph_context),
            model=self.llm_client.model_name,
        )
        
        return QueryResponse(
            answer=answer,
            citations=citations,
            expert=expert,
            is_low_confidence=is_low_confidence,
            metadata=metadata,
        )
