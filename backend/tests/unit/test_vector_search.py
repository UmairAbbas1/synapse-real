from __future__ import annotations
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from sqlalchemy import text
from app.core.vector_search import VectorSearchService, RetrievedChunk

class TestVectorSearch:
    @pytest.mark.asyncio
    @patch("app.core.vector_search.get_async_session_factory")
    async def test_search_rbac_enforced_in_sql(self, mock_factory: MagicMock) -> None:
        # Arrange
        mock_session = AsyncMock()
        mock_factory.return_value.return_value.__aenter__.return_value = mock_session
        
        mock_result = MagicMock()
        mock_result.fetchall.return_value = [
            MagicMock(id="1", chunk_text="test", source_url="url", doc_type="pdf", 
                      author="user", timestamp="2024", permission_tag="tag1", similarity=0.9)
        ]
        mock_session.execute.return_value = mock_result
        
        svc = VectorSearchService()
        vec = [0.1] * 384
        tags = ["tag1", "tag2"]
        
        # Act
        results = await svc.search(query_vector=vec, permission_tags=tags)
        
        # Assert
        assert len(results) == 1
        assert results[0].chunk_id == "1"
        
        # Verify SQL contains ANY(:tags)
        args, kwargs = mock_session.execute.call_args
        sql_obj = args[0]
        params = args[1]
        
        assert "WHERE permission_tag = ANY(:tags)" in sql_obj.text
        assert params["tags"] == tags
        assert params["vec"] == str(vec)
        # Verify no string concatenation (using parameters)
        assert ":vec" in sql_obj.text
        assert ":tags" in sql_obj.text

    @pytest.mark.asyncio
    @patch("app.core.vector_search.get_async_session_factory")
    async def test_search_wildcard_access(self, mock_factory: MagicMock) -> None:
        # Arrange
        mock_session = AsyncMock()
        mock_factory.return_value.return_value.__aenter__.return_value = mock_session
        
        mock_result = MagicMock()
        mock_result.fetchall.return_value = []
        mock_session.execute.return_value = mock_result
        
        svc = VectorSearchService()
        
        # Act
        await svc.search(query_vector=[0.1], permission_tags=["*"])
        
        # Assert
        args, _ = mock_session.execute.call_args
        sql_obj = args[0]
        assert "WHERE" not in sql_obj.text

    @pytest.mark.asyncio
    @patch("app.core.vector_search.get_async_session_factory")
    async def test_upsert_uses_on_conflict(self, mock_factory: MagicMock) -> None:
        # Arrange
        mock_session = AsyncMock()
        mock_factory.return_value.return_value.__aenter__.return_value = mock_session
        
        svc = VectorSearchService()
        chunks = [{
            "id": "1", "chunk_text": "text", "source_url": "url", "doc_type": "pdf",
            "author": "user", "timestamp": "2024", "permission_tag": "tag", "embedding": [0.1]
        }]
        
        # Act
        await svc.upsert_chunks(chunks)
        
        # Assert
        args, _ = mock_session.execute.call_args
        sql_obj = args[0]
        assert "ON CONFLICT (id) DO UPDATE SET" in sql_obj.text
        mock_session.commit.assert_awaited_once()

    @pytest.mark.asyncio
    @patch("app.core.vector_search.get_async_session_factory")
    async def test_empty_tags_returns_results_if_db_returns_them(self, mock_factory: MagicMock) -> None:
        # Arrange
        mock_session = AsyncMock()
        mock_factory.return_value.return_value.__aenter__.return_value = mock_session
        
        mock_result = MagicMock()
        mock_result.fetchall.return_value = []
        mock_session.execute.return_value = mock_result
        
        svc = VectorSearchService()
        
        # Act
        results = await svc.search(query_vector=[0.1], permission_tags=[])
        
        # Assert
        assert results == []
        args, _ = mock_session.execute.call_args
        params = args[1]
        assert params["tags"] == []
