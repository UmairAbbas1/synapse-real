"""Jira connector — stub until migrated."""

from collections.abc import AsyncGenerator

from app.connectors.base import BaseConnector, RawDocument


class JiraConnector(BaseConnector):
    async def authenticate(self) -> None:
        raise NotImplementedError("Jira connector not migrated")

    async def fetch_documents(self) -> AsyncGenerator[RawDocument, None]:  # type: ignore[override]
        docs: list[RawDocument] = []
        for d in docs:
            yield d

    async def health_check(self) -> bool:
        return False
