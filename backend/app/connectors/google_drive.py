"""Google Drive connector — stub until migrated."""

from collections.abc import AsyncGenerator

from app.connectors.base import BaseConnector, RawDocument


class GoogleDriveConnector(BaseConnector):
    async def authenticate(self) -> None:
        raise NotImplementedError("Google Drive connector not migrated")

    async def fetch_documents(self) -> AsyncGenerator[RawDocument, None]:  # type: ignore[override]
        docs: list[RawDocument] = []
        for d in docs:
            yield d

    async def health_check(self) -> bool:
        return False
