"""Sentence-Transformer embedding service."""

from __future__ import annotations

import asyncio
import time
from pathlib import Path

import structlog
from sentence_transformers import SentenceTransformer

from app.config import settings

logger = structlog.get_logger(__name__)

_model: SentenceTransformer | None = None


def load_embedding_model() -> None:
    """Load model at startup. Called once in lifespan."""
    global _model
    
    start_time = time.perf_counter()
    logger.info("embedding_model_load_started", model=settings.EMBEDDING_MODEL)

    cache_dir = Path(settings.HF_CACHE_DIR)

    _model = SentenceTransformer(
        settings.EMBEDDING_MODEL,
        cache_folder=str(cache_dir),
    )
    
    elapsed = time.perf_counter() - start_time
    logger.info(
        "embedding_model_load_completed",
        model=settings.EMBEDDING_MODEL,
        duration_ms=round(elapsed * 1000, 2),
    )


class EmbeddingService:
    """Service to handle vector generation using SentenceTransformer."""

    def encode(self, text: str) -> list[float]:
        """Convert a single text string into a normalized embedding vector."""
        if _model is None:
            raise RuntimeError("Embedding model not loaded. Call load_embedding_model() first.")
            
        if not text or not text.strip():
            raise ValueError("Input text for embedding cannot be empty.")
            
        vector = _model.encode(text, normalize_embeddings=True)
        return vector.tolist()

    def embed(self, text: str) -> list[float]:
        """Alias for encode — RAG pipeline entrypoint."""
        return self.encode(text)

    async def embed_async(self, text: str) -> list[float]:
        """Run encoding off the event loop."""
        return await asyncio.to_thread(self.embed, text)

    def encode_batch(self, texts: list[str]) -> list[list[float]]:
        """Convert a batch of text strings into normalized embedding vectors."""
        if _model is None:
            raise RuntimeError("Embedding model not loaded. Call load_embedding_model() first.")
            
        vectors = _model.encode(texts, normalize_embeddings=True, batch_size=64)
        return vectors.tolist()
