from unittest.mock import patch

import pytest

from app.core import embedding as embedding_mod
from app.core.embedding import EmbeddingService


class _StubModel:
    def encode(self, payload, normalize_embeddings=True, batch_size=None):  # noqa: ANN001
        if isinstance(payload, str):
            return _Vector([0.1] * 768)
        return _VectorBatch([[0.2] * 768 for _ in payload])


class _Vector(list):
    def tolist(self) -> list[float]:
        return list(self)


class _VectorBatch(list):
    def tolist(self) -> list[list[float]]:
        return list(self)


def test_embedding_dimension_matches() -> None:
    svc = EmbeddingService()
    with patch.object(embedding_mod, "_model", _StubModel()):
        vector = svc.encode("hello")
    assert len(vector) == 768


def test_embedding_batch_processing() -> None:
    svc = EmbeddingService()
    with patch.object(embedding_mod, "_model", _StubModel()):
        vectors = svc.encode_batch(["a", "b", "c"])
    assert len(vectors) == 3
    assert all(len(v) == 768 for v in vectors)


def test_embedding_empty_string() -> None:
    svc = EmbeddingService()
    with patch.object(embedding_mod, "_model", _StubModel()):
        with pytest.raises(ValueError):
            svc.encode("")


def test_embedding_special_characters() -> None:
    svc = EmbeddingService()
    with patch.object(embedding_mod, "_model", _StubModel()):
        vector = svc.encode("emoji 😀 symbols §∆")
    assert len(vector) == 768
