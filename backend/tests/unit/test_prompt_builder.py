from __future__ import annotations
from app.core.prompt_builder import PromptBuilder
from app.core.vector_search import RetrievedChunk

class TestPromptBuilder:
    def test_prompt_construction(self) -> None:
        # Arrange
        builder = PromptBuilder()
        query = "What is the policy?"
        chunks = [
            RetrievedChunk(chunk_id="1", chunk_text="Chunk 1 content", source_url="url1", 
                           doc_type="pdf", author="a1", timestamp="t1", permission_tag="p1", similarity=0.9),
            RetrievedChunk(chunk_id="2", chunk_text="Chunk 2 content", source_url="url2", 
                           doc_type="pdf", author="a2", timestamp="t2", permission_tag="p2", similarity=0.8),
            RetrievedChunk(chunk_id="3", chunk_text="Chunk 3 content", source_url="url3", 
                           doc_type="pdf", author="a3", timestamp="t3", permission_tag="p3", similarity=0.7),
        ]
        
        # Act
        system_prompt, user_prompt = builder.build(
            query=query,
            chunks=chunks,
            graph_context=[],
            is_low_confidence=False
        )
        
        # Assert
        assert "You are Synapse" in system_prompt
        assert "Chunk 1 content" in user_prompt
        assert "Chunk 2 content" in user_prompt
        assert "Chunk 3 content" in user_prompt
        assert query in user_prompt
        
    def test_low_confidence_prompt(self) -> None:
        # Arrange
        builder = PromptBuilder()
        
        # Act
        system_prompt, user_prompt = builder.build(
            query="gibberish",
            chunks=[],
            graph_context=[],
            is_low_confidence=True
        )
        
        # Assert
        # In the source: "NOTE: The search confidence for this query is low"
        assert "search confidence" in user_prompt.lower()
        assert "uncertainty" in user_prompt.lower()
