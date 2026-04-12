import math
import numpy as np
import pytest
from unittest.mock import patch

import app.core.embedding
from app.core.embedding import EmbeddingService

class DummySentenceTransformer:
    def __init__(self, model_name):
        self.model_name = model_name

    def encode(self, texts, normalize_embeddings=False, batch_size=None):
        is_single = isinstance(texts, str)
        text_list = [texts] if is_single else texts
        
        vectors = []
        for text in text_list:
            np.random.seed(len(text) + sum(ord(c) for c in text))
            vec = np.random.rand(768)
            vectors.append(vec)
            
        vectors = np.array(vectors)
        if normalize_embeddings:
            norms = np.linalg.norm(vectors, axis=1, keepdims=True)
            vectors = vectors / norms
            
        if is_single:
            return vectors[0].tolist()
        return vectors.tolist()


@pytest.fixture
def setup_dummy_model():
    with patch("app.core.embedding.SentenceTransformer", DummySentenceTransformer):
        app.core.embedding.load_embedding_model()
        yield
        app.core.embedding._model = None


@pytest.fixture
def embedding_svc(setup_dummy_model) -> EmbeddingService:
    return EmbeddingService()


def test_encode_returns_correct_dimensions(embedding_svc: EmbeddingService):
    result = embedding_svc.encode("Test dimensions")
    assert isinstance(result, list)
    assert len(result) == 768


def test_encode_normalizes_vectors(embedding_svc: EmbeddingService):
    result = embedding_svc.encode("Test normalization")
    magnitude = math.sqrt(sum(x * x for x in result))
    assert math.isclose(magnitude, 1.0, abs_tol=0.001)


def test_encode_batch_same_as_single(embedding_svc: EmbeddingService):
    text = "This should be identical"
    single_res = embedding_svc.encode(text)
    batch_res = embedding_svc.encode_batch([text])
    
    assert len(batch_res) == 1
    for v1, v2 in zip(single_res, batch_res[0]):
        assert math.isclose(v1, v2, abs_tol=1e-5)


def test_encode_empty_string_raises(embedding_svc: EmbeddingService):
    with pytest.raises(ValueError, match="cannot be empty"):
        embedding_svc.encode("")
    
    with pytest.raises(ValueError, match="cannot be empty"):
        embedding_svc.encode("   \n ")
