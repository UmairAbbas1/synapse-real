from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.expert_router import ExpertRouter


def _mock_driver_with_record(record: dict[str, object] | None) -> AsyncMock:
    driver = MagicMock()
    session = AsyncMock()
    result = AsyncMock()
    result.single.return_value = record
    session.run.return_value = result
    cm = MagicMock()
    cm.__aenter__.return_value = session
    cm.__aexit__.return_value = None
    driver.session.return_value = cm
    return driver


def test_extract_keywords_returns_values() -> None:
    router = ExpertRouter(_mock_driver_with_record(None))
    keywords = router._extract_keywords("database timeout in postgres pool", top_n=3)
    assert len(keywords) >= 1


@pytest.mark.asyncio
async def test_expert_router_exact_match() -> None:
    driver = _mock_driver_with_record(
        {
            "name": "Jane Doe",
            "email": "jane@company.com",
            "job_title": "Senior Backend Engineer",
            "relevance_score": 3,
        }
    )
    router = ExpertRouter(driver)
    expert = await router.find_expert("postgres timeout issue")
    assert expert is not None
    assert expert.email == "jane@company.com"


@pytest.mark.asyncio
async def test_expert_router_fallback_none() -> None:
    router = ExpertRouter(_mock_driver_with_record(None))
    expert = await router.find_expert("x")
    assert expert is None
