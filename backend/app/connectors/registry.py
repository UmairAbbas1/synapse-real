"""Connector mapping patterns extracting dynamic ingestion paths cleanly natively."""

import structlog
from typing import Callable, Type, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.connectors.base import BaseConnector

logger = structlog.get_logger(__name__)

# Registry holding string pointers back across explicitly active classes
_REGISTRY: Dict[str, Type[BaseConnector]] = {}

def register(source_type: str) -> Callable[[Type[BaseConnector]], Type[BaseConnector]]:
    """Factory algorithm automatically loading definitions natively within memory boundaries."""
    def decorator(cls: Type[BaseConnector]) -> Type[BaseConnector]:
        _REGISTRY[source_type] = cls
        logger.debug("connector_registered", source_type=source_type, cls=cls.__name__)
        return cls
    return decorator

async def get_connector(source_id: str, db: AsyncSession) -> BaseConnector:
    """Lookup database settings dynamically restoring saved configurations strictly enforcing connections."""
    
    # Executing dynamic retrieval structures directly towards sources datasets gracefully.
    try:
        result = await db.execute(
            text("SELECT type, config FROM sources WHERE id = :source_id AND is_deleted = false"),
            {"source_id": source_id}
        )
        row = result.fetchone()
    except Exception as e:
        logger.error("db_source_lookup_failed", error=str(e), source_id=source_id)
        raise ValueError("System error attempting database credential loads.")
        
    if not row:
        logger.error("source_not_found", source_id=source_id)
        raise ValueError(f"Source '{source_id}' does not exist.")
        
    source_type, config = row[0], row[1] or {}
    
    connector_class = _REGISTRY.get(source_type)
    if not connector_class:
        logger.error("connector_unsupported", source_type=source_type)
        raise ValueError(f"No connector registered for type '{source_type}'.")
        
    logger.info("connector_instantiated_dynamically", source_type=source_type)
    return connector_class(config)
