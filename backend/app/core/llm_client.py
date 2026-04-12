"""Ollama HTTP client with retries (Section 13 + .cursorrules)."""

from __future__ import annotations

import httpx
import structlog
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import settings

logger = structlog.get_logger()


class LLMClient:
    @property
    def model_name(self) -> str:
        return settings.OLLAMA_MODEL

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
        reraise=True,
    )
    async def generate(self, prompt: str) -> str:
        url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate"
        async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
            response = await client.post(
                url,
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False,
                },
            )
            response.raise_for_status()
            data = response.json()
        raw = data.get("response", "")
        if not isinstance(raw, str):
            logger.warning("llm_non_string_response", type_=type(raw).__name__)
            return str(raw)
        return raw
