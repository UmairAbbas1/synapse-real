"""Query API endpoints backed by the real QueryEngine."""

from __future__ import annotations

import json
import time
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse

from app.api.deps import get_audit_logger, get_current_user, get_query_engine
from app.core.audit_logger import AuditLogger
from app.core.query_engine import QueryEngine
from app.schemas.auth import CurrentUser
from app.schemas.query import QueryRequest, QueryResponse

router = APIRouter()


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.post("", response_model=QueryResponse)
async def query(
    payload: QueryRequest,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    query_engine: QueryEngine = Depends(get_query_engine),
    audit: AuditLogger = Depends(get_audit_logger),
) -> QueryResponse:
    """Execute a query against the RAG pipeline."""
    t0 = time.perf_counter()
    result = await query_engine.execute(payload.query, user.permission_tags, user.id)
    duration_ms = (time.perf_counter() - t0) * 1000
    await audit.log_query(
        user_id=user.id,
        query_text=payload.query,
        chunks=result.citations,
        answer=result.answer,
        ip_address=_client_ip(request),
        duration_ms=duration_ms,
        stream=False,
    )
    return result


@router.get("/stream")
async def stream_query(
    request: Request,
    q: str = Query(..., min_length=1),
    user: CurrentUser = Depends(get_current_user),
    query_engine: QueryEngine = Depends(get_query_engine),
    audit: AuditLogger = Depends(get_audit_logger),
) -> StreamingResponse:
    """Stream a query response as Server-Sent Events."""

    async def event_stream() -> AsyncGenerator[str, None]:
        t0 = time.perf_counter()
        answer_parts: list[str] = []
        chunk_count = 0

        async for chunk in query_engine.execute_stream(q, user.permission_tags, user.id):
            if '"type": "token"' in chunk:
                try:
                    line = chunk.strip()
                    if line.startswith("data: "):
                        obj = json.loads(line[6:])
                        token = obj.get("token", "")
                        if token:
                            answer_parts.append(str(token))
                except (json.JSONDecodeError, TypeError):
                    pass
            if '"type": "retrieval_done"' in chunk:
                try:
                    import json

                    line = chunk.strip()
                    if line.startswith("data: "):
                        obj = json.loads(line[6:])
                        chunk_count = int(obj.get("chunk_count", 0))
                except (json.JSONDecodeError, TypeError, ValueError):
                    pass
            yield chunk

        duration_ms = (time.perf_counter() - t0) * 1000
        await audit.log_query(
            user_id=user.id,
            query_text=q,
            chunks=list(range(chunk_count)),
            answer="".join(answer_parts),
            ip_address=_client_ip(request),
            duration_ms=duration_ms,
            stream=True,
        )

    return StreamingResponse(event_stream(), media_type="text/event-stream")
