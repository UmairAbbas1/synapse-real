"""Ollama LLM client for generating RAG responses."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from collections.abc import AsyncIterator

import httpx
import structlog
from tenacity import (
    RetryCallState,
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

logger = structlog.get_logger(__name__)
stdlib_logger = logging.getLogger(__name__)


class LLMUnavailableError(Exception):
    """Raised when Ollama is unreachable or fails after retries."""

    pass


def _raise_llm_unavailable(retry_state: RetryCallState) -> None:
    logger.error("ollama_exhausted_retries", attempts=retry_state.attempt_number)
    raise LLMUnavailableError()


class LLMClient:
    def __init__(self, base_url: str, model: str, timeout: int = 120) -> None:
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
        retry_error_callback=_raise_llm_unavailable,
    )
    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        """Call Ollama /api/generate endpoint with retry configuration."""
        payload: dict[str, object] = {
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
        except httpx.HTTPStatusError as exc:
            logger.error("ollama_http_failed", status_code=exc.response.status_code)
            raise LLMUnavailableError() from None
        except json.JSONDecodeError as exc:
            logger.error("ollama_generate_invalid_json", error=str(exc))
            raise LLMUnavailableError() from None

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        answer = str(data.get("response", ""))

        logger.info(
            "llm_generation_complete",
            model=self.model,
            prompt_length=len(prompt),
            response_length=len(answer),
            duration_ms=duration_ms,
        )
        return answer

    async def generate_stream(
        self,
        prompt: str,
        system_prompt: str = "",
    ) -> AsyncIterator[str]:
        """POST /api/generate with stream=true; yield one token string at a time."""
        payload: dict[str, object] = {
            "model": self.model,
            "prompt": prompt,
            "stream": True,
        }
        if system_prompt:
            payload["system"] = system_prompt

        for attempt in range(1, 4):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    async with client.stream(
                        "POST",
                        f"{self.base_url}/api/generate",
                        json=payload,
                    ) as resp:
                        resp.raise_for_status()
                        async for line in resp.aiter_lines():
                            if not line:
                                continue
                            try:
                                obj = json.loads(line)
                            except json.JSONDecodeError as exc:
                                logger.error("ollama_stream_invalid_json", error=str(exc))
                                raise LLMUnavailableError() from exc
                            piece = obj.get("response", "")
                            if piece != "":
                                yield str(piece)
                return
            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                logger.warning(
                    "ollama_stream_retry",
                    attempt=attempt,
                    error=str(exc),
                )
                if attempt < 3:
                    await asyncio.sleep(min(30.0, 2.0**attempt))
                    continue
                logger.error("ollama_stream_exhausted_retries", error=str(exc))
                raise LLMUnavailableError() from exc
            except httpx.HTTPStatusError as exc:
                logger.error("ollama_stream_http_failed", status_code=exc.response.status_code)
                raise LLMUnavailableError() from exc

    async def health_check(self) -> bool:
        """GET /api/tags — True if 200, False otherwise; never raises."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                return resp.status_code == 200
        except Exception:
            return False
