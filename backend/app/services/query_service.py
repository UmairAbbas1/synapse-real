"""Orchestrator for managing the exact QAE core pipeline execution contexts dynamically."""

import structlog

from app.core.query_engine import QueryEngine
from app.schemas.query import QueryResponse

logger = structlog.get_logger(__name__)


class QueryService:
    def __init__(self, engine: QueryEngine):
        """Build instances of deep engine handlers properly isolating components transparently."""
        self.engine = engine

    async def execute_query(self, query: str, user_id: str, permission_tags: list[str]) -> QueryResponse:
        """Call standard implementations protecting outer logic faults."""
        logger.info("executing_query_service", user_id=user_id)
        
        return await self.engine.execute(
            query=query, 
            user_permission_tags=permission_tags, 
            user_id=user_id
        )
