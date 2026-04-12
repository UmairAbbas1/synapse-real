from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncGenerator


@dataclass
class RawDocument:
    """Normalized document from any source."""
    source_id: str
    source_type: str          # 'slack', 'github', 'jira', 'google_drive'
    source_url: str
    title: str
    content: str              # Plain text content
    author_email: str
    author_name: str
    permission_tags: list[str]
    created_at: str           # ISO 8601
    updated_at: str
    metadata: dict            # Source-specific metadata


class BaseConnector(ABC):
    """All connectors must implement this interface."""
    
    @abstractmethod
    async def authenticate(self, credentials: dict) -> bool:
        """Validate OAuth credentials. Return True if valid."""
        pass
    
    @abstractmethod
    async def fetch_documents(
        self, 
        since: str | None = None,
    ) -> AsyncGenerator[RawDocument, None]:
        """Yield documents from the source."""
        pass
    
    @abstractmethod
    async def test_connection(self) -> bool:
        """Quick connectivity check."""
        pass
