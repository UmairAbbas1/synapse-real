"""FastAPI application entrypoint (full factory pattern)."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.api.router import api_router
from app.api.middleware.request_id import RequestIDMiddleware
from app.api.middleware.error_handler import global_exception_handler
from app.db.postgres import init_db, close_db
from app.db.neo4j import init_neo4j, close_neo4j
from app.db.neo4j import get_neo4j_driver
from app.db.redis import init_redis, close_redis
from app.core.embedding import EmbeddingService
from app.core.embedding import load_embedding_model
from app.core.vector_search import VectorSearchService
from app.core.graph_search import GraphSearchService
from app.core.llm_client import LLMClient
from app.core.expert_router import ExpertRouter
from app.core.prompt_builder import PromptBuilder
from app.core.citation_builder import CitationBuilder
from app.limiter import limiter

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: connect all services. Shutdown: close all connections."""
    await init_db()
    await init_neo4j()
    await init_redis()
    load_embedding_model()
    app.state.embedding_svc = EmbeddingService()
    app.state.vector_svc = VectorSearchService()
    app.state.graph_svc = GraphSearchService(get_neo4j_driver())
    app.state.llm_client = LLMClient(
        base_url=settings.OLLAMA_BASE_URL,
        model=settings.OLLAMA_MODEL,
        timeout=settings.OLLAMA_TIMEOUT,
    )
    app.state.expert_router = ExpertRouter(get_neo4j_driver())
    app.state.prompt_builder = PromptBuilder()
    app.state.citation_builder = CitationBuilder()

    yield

    await close_db()
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
    app.add_middleware(RequestIDMiddleware)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_exception_handler(Exception, global_exception_handler)
    app.include_router(api_router, prefix="/api")
    return app

app = create_app()
