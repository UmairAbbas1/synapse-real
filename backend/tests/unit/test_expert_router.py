"""Test suite ensuring exact sklearn TF-IDF mappings and correct overrides."""

import pytest
from app.core.expert_router import ExpertRouter


class DummyDriver:
    """Mock structural wrapper blocking database calls unconditionally."""
    pass


@pytest.fixture
def router():
    return ExpertRouter(neo4j_driver=DummyDriver())


def test_extract_keywords_returns_correct_count(router):
    text = "Machine learning algorithms optimize predictive performance models significantly across datasets."
    keywords = router._extract_keywords(text, top_n=3)
    assert len(keywords) == 3


def test_extract_keywords_removes_stopwords(router):
    text = "The and or machine learning is very good."
    keywords = router._extract_keywords(text, top_n=5)
    
    # Ensure raw stop words defined inside `english` stop_words arrays parse strictly out
    assert "machine" in keywords
    assert "learning" in keywords
    assert "the" not in keywords
    assert "and" not in keywords


def test_extract_keywords_short_text_fallback(router):
    # Triggers ValueError gracefully bypassing sklearn boundaries inside fit_transform
    text = "to be or not to be"
    keywords = router._extract_keywords(text, top_n=3)
    
    assert len(keywords) > 0
    assert keywords[0] == "to"
