from __future__ import annotations
import pytest
import respx
import httpx
from app.core.llm_client import LLMClient, LLMUnavailableError

class TestLLMClient:
    @pytest.mark.asyncio
    @respx.mock
    async def test_generate_success(self) -> None:
        # Arrange
        client = LLMClient(base_url="http://ollama:11434", model="llama3:8b")
        respx.post("http://ollama:11434/api/generate").mock(
            return_value=httpx.Response(200, json={"response": "Hello world"})
        )
        
        # Act
        response = await client.generate("hi")
        
        # Assert
        assert response == "Hello world"

    @pytest.mark.asyncio
    @respx.mock
    async def test_generate_retries_on_connect_error(self) -> None:
        # Arrange
        client = LLMClient(base_url="http://ollama:11434", model="llama3:8b")
        # Fail twice, succeed third time
        route = respx.post("http://ollama:11434/api/generate")
        route.side_effect = [httpx.ConnectError("failed"), httpx.ConnectError("failed"), httpx.Response(200, json={"response": "recovered"})]
        
        # Act
        # We need to set a small wait time for tests if possible, but tenacity uses fixed defaults here.
        # Given the 3x retry requirement, this should pass after 3 attempts.
        response = await client.generate("hi")
        
        # Assert
        assert response == "recovered"
        assert route.call_count == 3

    @pytest.mark.asyncio
    @respx.mock
    async def test_generate_exhausts_retries_and_raises_unavailable(self) -> None:
        # Arrange
        client = LLMClient(base_url="http://ollama:11434", model="llama3:8b")
        respx.post("http://ollama:11434/api/generate").mock(side_effect=httpx.ConnectError("failed"))
        
        # Act & Assert
        with pytest.raises(LLMUnavailableError):
            await client.generate("hi")

    @pytest.mark.asyncio
    @respx.mock
    async def test_generate_timeout_raises_unavailable(self) -> None:
        # Arrange
        client = LLMClient(base_url="http://ollama:11434", model="llama3:8b")
        respx.post("http://ollama:11434/api/generate").mock(side_effect=httpx.TimeoutException("timeout"))
        
        # Act & Assert
        with pytest.raises(LLMUnavailableError):
            await client.generate("hi")

    @pytest.mark.asyncio
    @respx.mock
    async def test_generate_stream_yields_tokens(self) -> None:
        # Arrange
        client = LLMClient(base_url="http://ollama:11434", model="llama3:8b")
        stream_content = [
            '{"response": "Hello"}',
            '{"response": " "}',
            '{"response": "world"}'
        ]
        respx.post("http://ollama:11434/api/generate").mock(
            return_value=httpx.Response(200, content="\n".join(stream_content).encode())
        )
        
        # Act
        tokens = []
        async for token in client.generate_stream("hi"):
            tokens.append(token)
            
        # Assert
        assert tokens == ["Hello", " ", "world"]

    @pytest.mark.asyncio
    @respx.mock
    async def test_health_check(self) -> None:
        # Arrange
        client = LLMClient(base_url="http://ollama:11434", model="llama3:8b")
        
        # Success case
        respx.get("http://ollama:11434/api/tags").mock(return_value=httpx.Response(200))
        assert await client.health_check() is True
        
        # 500 case
        respx.get("http://ollama:11434/api/tags").mock(return_value=httpx.Response(500))
        assert await client.health_check() is False
        
        # Connect error case
        respx.get("http://ollama:11434/api/tags").mock(side_effect=httpx.ConnectError("failed"))
        assert await client.health_check() is False
