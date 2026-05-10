"""Connector registry."""

from __future__ import annotations

import structlog

from app.connectors.base import BaseConnector
from app.connectors.mock import MockConnector

logger = structlog.get_logger(__name__)

CONNECTOR_REGISTRY: dict[str, type[BaseConnector]] = {
    "mock": MockConnector,
}


def get_connector(source_type: str, credentials: dict[str, object]) -> BaseConnector:
    cls = CONNECTOR_REGISTRY.get(source_type)
    if cls is None:
        logger.error("connector_missing", source_type=source_type)
        raise ValueError(f"Unsupported source_type: {source_type}")
    return cls(credentials)
