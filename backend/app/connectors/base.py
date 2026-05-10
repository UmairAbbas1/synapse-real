"""Connector interfaces and normalized document record."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from collections.abc import AsyncGenerator


@dataclass
class RawDocument:
    source_url: str
    doc_type: str
    title: str
    content: str
    author: str
    author_email: str
    timestamp: datetime
    metadata: dict[str, object]
    permission_tag: str
    source_id: str = ""

    @property
    def source_type(self) -> str:
        return self.doc_type

    @property
    def author_name(self) -> str:
        return self.author

    @property
    def created_at(self) -> datetime:
        return self.timestamp

    @property
    def updated_at(self) -> datetime:
        return self.timestamp


class BaseConnector(ABC):
    """Base class for ingestion connectors."""

    def __init__(self, credentials: dict[str, object]) -> None:
        self.credentials = credentials

    @abstractmethod
    async def authenticate(self) -> None:
        """Validate credentials / establish session."""

    async def fetch_documents(self) -> AsyncGenerator[RawDocument, None]:
        """Yield documents from upstream."""
        raise NotImplementedError

    @abstractmethod
    async def health_check(self) -> bool:
        """Return True if connector configuration is usable."""
