"""FastAPI application entrypoint (full factory in Phase 1 Step 06)."""

from __future__ import annotations

from fastapi import FastAPI

from app.config import settings


def create_app() -> FastAPI:
    """Create ASGI app; expanded with lifespan and routers in later steps."""
    app = FastAPI(
        title="Synapse API",
        description="Enterprise Knowledge Graph & AI Assistant",
        version="1.0.0",
    )

    @app.get("/api/v1/health", tags=["health"])
    async def health() -> dict[str, str]:
        """Liveness/readiness probe for Docker and orchestrators."""
        return {"status": "ok"}

    return app


app = create_app()
