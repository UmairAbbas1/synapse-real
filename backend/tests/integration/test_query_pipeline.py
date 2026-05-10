from __future__ import annotations
import pytest
from httpx import AsyncClient
from app.main import app
from unittest.mock import MagicMock, AsyncMock
from app.core.vector_search import RetrievedChunk

@pytest.mark.asyncio
class TestQueryPipeline:
    async def test_admin_query_success(self, client: AsyncClient) -> None:
        # Arrange
        login_data = {"email": "admin@company.com", "password": "Admin123!"}
        login_resp = await client.post("/api/v1/auth/login", json=login_data)
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Mock QueryEngine execution
        app.state.embedding_svc.embed.return_value = [0.1] * 384
        chunk = RetrievedChunk(
            chunk_id="1", chunk_text="Admin info", source_url="url", 
            doc_type="pdf", author="admin", timestamp="2024", 
            permission_tag="*", similarity=0.9
        )
        app.state.vector_svc.search.return_value = [chunk]
        app.state.graph_svc.enrich.return_value = []
        app.state.prompt_builder.build.return_value = ("sys", "user")
        app.state.llm_client.generate.return_value = "Admin answer"
        app.state.llm_client.model_name = "llama3:8b"
        app.state.citation_builder.build.return_value = []
        
        # Act
        resp = await client.post("/api/v1/query", json={"query": "secret admin query"}, headers=headers)
        
        # Assert
        assert resp.status_code == 200
        data = resp.json()
        assert data["answer"] == "Admin answer"
        assert "metadata" in data
        assert data["is_low_confidence"] is False

    async def test_rbac_blocking_returns_low_confidence(self, client: AsyncClient) -> None:
        # Arrange
        login_data = {"email": "jamie.junior@company.com", "password": "Demo1234!"}
        login_resp = await client.post("/api/v1/auth/login", json=login_data)
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Mock vector search to return no chunks because of RBAC tags
        app.state.embedding_svc.embed.return_value = [0.1] * 384
        app.state.vector_svc.search.return_value = [] # No access
        app.state.graph_svc.enrich.return_value = []
        app.state.prompt_builder.build.return_value = ("sys", "user")
        app.state.llm_client.generate.return_value = "I don't know"
        app.state.llm_client.model_name = "llama3:8b"
        app.state.citation_builder.build.return_value = []
        app.state.expert_router.find_expert.return_value = None
        
        # Act
        resp = await client.post("/api/v1/query", json={"query": "admin secret query"}, headers=headers)
        
        # Assert
        assert resp.status_code == 200
        assert resp.json()["is_low_confidence"] is True

    async def test_unauthenticated_query_fails(self, client: AsyncClient) -> None:
        resp = await client.post("/api/v1/query", json={"query": "test"})
        assert resp.status_code == 401
