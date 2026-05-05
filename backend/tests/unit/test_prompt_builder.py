from app.core.prompt_builder import PromptBuilder
from app.core.vector_search import RetrievedChunk


def _chunk(text: str, score: float = 0.9) -> RetrievedChunk:
    return RetrievedChunk(
        text=text,
        score=score,
        source_url="https://example.com",
        source_type="slack",
        document_title="Runbook",
        author="jane@company.com",
        timestamp="2026-01-01T00:00:00Z",
    )


def test_prompt_includes_context_chunks() -> None:
    builder = PromptBuilder()
    system_prompt, user_prompt = builder.build(
        query="How to fix DB errors?",
        chunks=[_chunk("Check connection pool settings.")],
        graph_context=[],
        is_low_confidence=False,
    )
    assert "internal AI assistant" in system_prompt
    assert "Check connection pool settings." in user_prompt


def test_prompt_low_confidence_addendum_appended() -> None:
    builder = PromptBuilder()
    _, user_prompt = builder.build(
        query="Unknown issue",
        chunks=[_chunk("Potentially related data.", score=0.42)],
        graph_context=[],
        is_low_confidence=True,
    )
    assert "search confidence for this query is low" in user_prompt.lower()
    assert "0.42" in user_prompt


def test_prompt_company_name_formatting() -> None:
    builder = PromptBuilder()
    system_prompt, _ = builder.build(
        query="Policy?",
        chunks=[_chunk("Policy excerpt")],
        graph_context=[],
        is_low_confidence=False,
        company_name="Acme Corp",
    )
    assert "Acme Corp" in system_prompt
