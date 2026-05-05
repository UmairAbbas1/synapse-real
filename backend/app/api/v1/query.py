"""Query API endpoints backed by the real QueryEngine."""

from __future__ import annotations

import json
from collections.abc import AsyncGenerator

import structlog
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse, StreamingResponse

from app.api.deps import get_query_engine
from app.api.middleware.auth import get_current_user
from app.api.middleware.error_handler import LLMUnavailableError, VectorDBError
from app.core.query_engine import QueryEngine
from app.schemas.auth import TokenPayload
from app.schemas.query import QueryRequest, QueryResponse

logger = structlog.get_logger(__name__)
router = APIRouter()


def _get_permission_tags(user: TokenPayload) -> list[str]:
    permission_tags = getattr(user, "permission_tags", None)
    if isinstance(permission_tags, list):
        return [str(tag) for tag in permission_tags]
    return [str(permission) for permission in user.permissions]


def _response_to_dict(response: QueryResponse) -> dict[str, object]:
    return response.model_dump(mode="json")


def _sse_event(payload: dict[str, object]) -> str:
    return f"data: {json.dumps(payload)}\n\n"


@router.post("", response_model=QueryResponse)
async def query(
    payload: QueryRequest,
    user: TokenPayload = Depends(get_current_user),
    query_engine: QueryEngine = Depends(get_query_engine),
) -> QueryResponse | JSONResponse:
    """Execute a query against the RAG pipeline."""
    permission_tags = _get_permission_tags(user)
    user_id = user.sub
    query_text = payload.question

    try:
        response = await query_engine.execute(query_text, permission_tags, user_id)
    except LLMUnavailableError:
        logger.warning("query_llm_unavailable", user_id=user_id)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": "LLM unavailable"},
        )
    except VectorDBError:
        logger.error("query_vector_db_error", user_id=user_id)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Vector database error"},
        )

    return response


@router.get("/stream")
async def stream_query(
    q: str = Query(..., min_length=1),
    user: TokenPayload = Depends(get_current_user),
    query_engine: QueryEngine = Depends(get_query_engine),
) -> StreamingResponse:
    """Stream a query response as Server-Sent Events."""

    async def event_stream() -> AsyncGenerator[str, None]:
        permission_tags = _get_permission_tags(user)
        user_id = user.sub

        try:
            response = await query_engine.execute(q, permission_tags, user_id)
        except LLMUnavailableError:
            logger.warning("stream_llm_unavailable", user_id=user_id)
            yield _sse_event({"type": "error", "message": "LLM unavailable"})
            return
        except VectorDBError:
            logger.error("stream_vector_db_error", user_id=user_id)
            yield _sse_event({"type": "error", "message": "Vector database error"})
            return

        response_data = _response_to_dict(response)
        citations = response_data.get("citations", [])
        expert = response_data.get("expert")
        metadata = response_data.get("metadata", {})
        confidence = metadata.get("top_similarity_score", 0.0) if isinstance(metadata, dict) else 0.0

        yield _sse_event(
            {
                "type": "retrieval_done",
                "chunk_count": len(citations) if isinstance(citations, list) else 0,
            }
        )

        for token in response.answer.split(" "):
            yield _sse_event({"type": "token", "token": token})

        yield _sse_event(
            {
                "type": "complete",
                "citations": citations,
                "expert": expert,
                "confidence": confidence,
            }
        )

    return StreamingResponse(event_stream(), media_type="text/event-stream")
