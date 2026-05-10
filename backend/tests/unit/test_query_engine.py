from __future__ import annotations
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from app.core.query_engine import QueryEngine
from app.core.llm_client import LLMUnavailableError
from app.core.vector_search import RetrievedChunk
from app.schemas.query import ExpertSuggestion

class TestQueryEngine:
    @pytest.fixture
    def mock_deps(self):
        return {
            "embedding_svc": MagicMock(),
            "vector_svc": AsyncMock(),
            "graph_svc": AsyncMock(),
            "llm_client": AsyncMock(),
            "expert_router": AsyncMock(),
            "prompt_builder": MagicMock(),
            "citation_builder": MagicMock(),
        }

    @pytest.mark.asyncio
    async def test_execute_success_path(self, mock_deps) -> None:
        # Arrange
        engine = QueryEngine(**mock_deps)
        mock_deps["embedding_svc"].embed.return_value = [0.1] * 384
        chunk = RetrievedChunk(chunk_id="1", chunk_text="test", source_url="url", 
                               doc_type="pdf", author="user", timestamp="2024", 
                               permission_tag="tag", similarity=0.9)
        mock_deps["vector_svc"].search.return_value = [chunk]
        mock_deps["graph_svc"].enrich.return_value = []
        mock_deps["prompt_builder"].build.return_value = ("system", "user")
        mock_deps["llm_client"].generate.return_value = "The answer"
        mock_deps["llm_client"].model_name = "llama3:8b"
        mock_deps["citation_builder"].build.return_value = []
        
        # Act
        resp = await engine.execute("query", ["tag"], "user123")
        
        # Assert
        assert resp.answer == "The answer"
        assert resp.is_low_confidence is False
        mock_deps["expert_router"].find_expert.assert_not_called()
        assert resp.metadata.top_similarity_score == 0.9

    @pytest.mark.asyncio
    async def test_execute_low_confidence_calls_expert_router(self, mock_deps) -> None:
        # Arrange
        engine = QueryEngine(**mock_deps)
        mock_deps["embedding_svc"].embed.return_value = [0.1] * 384
        chunk = RetrievedChunk(chunk_id="1", chunk_text="test", source_url="url", 
                               doc_type="pdf", author="user", timestamp="2024", 
                               permission_tag="tag", similarity=0.2) # < 0.3
        mock_deps["vector_svc"].search.return_value = [chunk]
        mock_deps["graph_svc"].enrich.return_value = []
        mock_deps["prompt_builder"].build.return_value = ("system", "user")
        mock_deps["llm_client"].generate.return_value = "The answer"
        mock_deps["llm_client"].model_name = "llama3:8b"
        mock_deps["citation_builder"].build.return_value = []
        
        expert = ExpertSuggestion(name="Expert", email="e@e.com", job_title="Lead", relevance_score=0.9)
        mock_deps["expert_router"].find_expert.return_value = expert
        
        # Act
        resp = await engine.execute("query", ["tag"], "user123")
        
        # Assert
        assert resp.is_low_confidence is True
        mock_deps["expert_router"].find_expert.assert_called_once_with("query")
        assert resp.expert == expert

    @pytest.mark.asyncio
    async def test_execute_llm_unavailable_continues_gracefully(self, mock_deps) -> None:
        # Arrange
        engine = QueryEngine(**mock_deps)
        mock_deps["embedding_svc"].embed.return_value = [0.1] * 384
        mock_deps["vector_svc"].search.return_value = [] # Low confidence
        mock_deps["graph_svc"].enrich.return_value = []
        mock_deps["prompt_builder"].build.return_value = ("system", "user")
        mock_deps["llm_client"].generate.side_effect = LLMUnavailableError()
        mock_deps["llm_client"].model_name = "llama3:8b"
        mock_deps["citation_builder"].build.return_value = []
        
        # Act
        resp = await engine.execute("query", ["tag"], "user123")
        
        # Assert
        assert resp.answer == ""
        assert resp.is_low_confidence is True
        # Code skips expert if LLM fails: if low_confidence and not llm_failed:
        mock_deps["expert_router"].find_expert.assert_not_called()
