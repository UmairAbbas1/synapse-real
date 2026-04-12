"""FastAPI application entrypoint (full factory pattern)."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.router import api_router
from app.api.middleware.request_id import RequestIDMiddleware
from app.api.middleware.error_handler import global_exception_handler
from app.db.postgres import init_db, close_db
from app.db.qdrant import init_qdrant, close_qdrant
from app.db.neo4j import init_neo4j, close_neo4j
from app.db.redis import init_redis, close_redis
from app.core.embedding import load_embedding_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: connect all services. Shutdown: close all connections."""
    # Startup
    await init_db()
    await init_qdrant()
    await init_neo4j()
    await init_redis()
    load_embedding_model()
    
    yield
    
    # Shutdown
    await close_db()
    await close_qdrant()
    await close_neo4j()
    await close_redis()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Synapse API",
        description="Enterprise Knowledge Graph & AI Assistant",
        version="1.0.0",
        docs_url="/api/docs" if settings.DEBUG else None,
        redoc_url="/api/redoc" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # Middleware (order matters — outermost first)
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception handlers
    app.add_exception_handler(Exception, global_exception_handler)

    # Routes
    app.include_router(api_router, prefix="/api")

    return app


app = create_app()
