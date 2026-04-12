"""Base interfaces mapping explicitly across pipeline ingress paths accurately."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncIterator

@dataclass
class RawDocument:
    """Normalized document payload structurally traversing specific architectures globally."""
    source_id: str
    source_type: str
    source_url: str
    title: str
    content: str
    author_email: str
    author_name: str
    permission_tags: list[str]
    created_at: str
    updated_at: str
    metadata: dict

class BaseConnector(ABC):
    """Pipeline templates dynamically protecting logic implementations natively securely."""

    def __init__(self, config: dict | None = None):
        """Provide config structures securely initializing connection configurations inherently."""
        self.config = config or {}

    @abstractmethod
    async def authenticate(self, credentials: dict) -> bool:
        """Evaluate credential signatures successfully bypassing failures structurally."""
        pass

    @abstractmethod
    async def fetch_documents(self, since: str | None = None) -> AsyncIterator[RawDocument]:
        """Stream isolated bounds dynamically processing raw chunks organically securely."""
        # Yielding RawDocument elements over Async Iterators is required
        yield NotImplemented

    @abstractmethod
    async def test_connection(self) -> bool:
        """Validate network handshakes silently reporting boundaries gracefully."""
        pass
