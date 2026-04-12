"""Sentence-Transformer embedding service (Section 8)."""

from __future__ import annotations

from sentence_transformers import SentenceTransformer

from app.config import settings

_model: SentenceTransformer | None = None


def load_embedding_model() -> None:
    """Load model at startup. Called once in lifespan."""
    global _model
    _model = SentenceTransformer(settings.EMBEDDING_MODEL)


class EmbeddingService:
    def encode(self, text: str) -> list[float]:
        if _model is None:
            raise RuntimeError("Embedding model not loaded")
        vector = _model.encode(text, normalize_embeddings=True)
        return vector.tolist()

    def encode_batch(self, texts: list[str]) -> list[list[float]]:
        if _model is None:
            raise RuntimeError("Embedding model not loaded")
        vectors = _model.encode(texts, normalize_embeddings=True, batch_size=64)
        return vectors.tolist()
