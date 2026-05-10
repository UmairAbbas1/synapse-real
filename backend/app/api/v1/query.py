"""Query API endpoints backed by the real QueryEngine."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.api.deps import get_current_user, get_query_engine
from app.core.query_engine import QueryEngine
from app.schemas.auth import CurrentUser
from app.schemas.query import QueryRequest, QueryResponse

router = APIRouter()


@router.post("", response_model=QueryResponse)
async def query(
    payload: QueryRequest,
    user: CurrentUser = Depends(get_current_user),
    query_engine: QueryEngine = Depends(get_query_engine),
) -> QueryResponse:
    """Execute a query against the RAG pipeline."""
    permission_tags = user.permission_tags
    user_id = user.id
    query_text = payload.query

    return await query_engine.execute(query_text, permission_tags, user_id)


@router.get("/stream")
async def stream_query(
    q: str = Query(..., min_length=1),
    user: CurrentUser = Depends(get_current_user),
    query_engine: QueryEngine = Depends(get_query_engine),
) -> StreamingResponse:
    """Stream a query response as Server-Sent Events."""

    async def event_stream() -> AsyncGenerator[str, None]:
        permission_tags = user.permission_tags
        user_id = user.id

        async for chunk in query_engine.execute_stream(q, permission_tags, user_id):
            yield chunk

    return StreamingResponse(event_stream(), media_type="text/event-stream")
