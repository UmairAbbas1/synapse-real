from fastapi import Request
from fastapi.responses import JSONResponse
import structlog

from app.schemas.common import ErrorResponse

logger = structlog.get_logger(__name__)


class SynapseError(Exception):
    """Base exception for all Synapse errors."""
    def __init__(self, message: str, status_code: int = 500, error_code: str = "INTERNAL_ERROR"):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code


class AuthenticationError(SynapseError):
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, 401, "AUTH_ERROR")


class AuthorizationError(SynapseError):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, 403, "FORBIDDEN")


class NotFoundError(SynapseError):
    def __init__(self, resource: str, identifier: str):
        super().__init__(f"{resource} '{identifier}' not found", 404, "NOT_FOUND")


class LLMUnavailableError(SynapseError):
    def __init__(self):
        super().__init__("AI service temporarily unavailable. Please retry.", 503, "LLM_UNAVAILABLE")


class VectorDBError(SynapseError):
    def __init__(self):
        super().__init__("Search service error. Please retry.", 503, "VECTOR_DB_ERROR")


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    
    if isinstance(exc, SynapseError):
        logger.warning(
            "handled_error",
            error_code=exc.error_code,
            message=exc.message,
            request_id=request_id,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error=exc.error_code,
                message=exc.message,
                request_id=request_id
            ).model_dump()
        )
    
    # Unhandled exceptions - hide raw trace from user
    logger.error(
        "unhandled_error",
        error=str(exc),
        request_id=request_id,
        exc_info=True
    )
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="INTERNAL_ERROR",
            message="An unexpected error occurred.",
            request_id=request_id
        ).model_dump()
    )
