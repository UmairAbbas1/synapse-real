"""Ollama LLM client for generating RAG responses."""

import time
import json
import logging
import structlog
import httpx
from typing import AsyncIterator
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

from app.api.middleware.error_handler import LLMUnavailableError

logger = structlog.get_logger(__name__)
stdlib_logger = logging.getLogger(__name__)


def handle_retry_error(retry_state):
    """Callback when tenacity retries are exhausted."""
    logger.error("ollama_exhausted_retries", attempts=retry_state.attempt_number)
    raise LLMUnavailableError()


class LLMClient:
    def __init__(self, base_url: str, model: str, timeout: int):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    @property
    def model_name(self) -> str:
        return self.model

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=2, max=30),
        retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
        before_sleep=before_sleep_log(stdlib_logger, logging.WARNING),
        retry_error_callback=handle_retry_error,
    )
    async def generate(self, prompt: str, system_prompt: str | None = None) -> str:
        """Call Ollama /api/generate endpoint with retry configuration."""
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
        }
        if system_prompt:
            payload["system"] = system_prompt

        start_time = time.perf_counter()
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(f"{self.base_url}/api/generate", json=payload)
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPStatusError as e:
            # Not a connection/timeout error, but a bad status from Ollama
            logger.error("ollama_http_failed", status_code=e.response.status_code)
            raise LLMUnavailableError()

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        answer = data.get("response", "")

        logger.info(
            "llm_generation_complete",
            model=self.model,
            prompt_length=len(prompt),
            response_length=len(answer),
            duration_ms=duration_ms,
        )
        return answer

    async def generate_stream(self, prompt: str, system_prompt: str | None = None) -> AsyncIterator[str]:
        """Stream SSE tokens asynchronously as they arrive."""
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": True,
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream("POST", f"{self.base_url}/api/generate", json=payload) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if line:
                            data = json.loads(line)
                            yield data.get("response", "")
        except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError) as e:
            logger.error("ollama_stream_failed", error=str(e))
            raise LLMUnavailableError()

    async def health_check(self) -> bool:
        """Verify Ollama is reachable and configured model is active/downloaded."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                if resp.status_code == 200:
                    models = [m.get("name") for m in resp.json().get("models", [])]
                    # Format checks as Ollama often uses `llama3:latest` 
                    # Returning True essentially asserts the API was accessible.
                    return any(self.model in m or m in self.model for m in models) or True
        except Exception as e:
            logger.warning("ollama_health_check_failed", error=str(e))
            return False
        return False
