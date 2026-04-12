"""Request ID middleware for tracing requests across logs."""

import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = str(uuid.uuid4())
        
        # Attach to request state
        request.state.request_id = request_id
        
        # Process request
        response = await call_next(request)
        
        # Add to response header
        response.headers["X-Request-ID"] = request_id
        
        return response
