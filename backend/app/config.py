"""Application settings (SYNAPSE_MASTER_PROMPT.md Section 5)."""

from __future__ import annotations

import json
from typing import Annotated, Any

from pydantic import BeforeValidator, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _parse_cors_origins(value: Any) -> list[str]:
    """Parse CORS origins from JSON array or comma-separated env string."""
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return ["http://localhost:3000"]
        if raw.startswith("["):
            parsed = json.loads(raw)
            if not isinstance(parsed, list):
                raise ValueError("CORS_ORIGINS JSON must be an array")
            return [str(item).strip() for item in parsed if str(item).strip()]
        return [part.strip() for part in raw.split(",") if part.strip()]
    raise TypeError("CORS_ORIGINS must be a list or string")


CORSOrigins = Annotated[list[str], BeforeValidator(_parse_cors_origins)]


class Settings(BaseSettings):
    """Runtime configuration — secrets from environment only (.cursorrules RULE 07)."""

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.dev"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # App
    APP_NAME: str = "Synapse"
    DEBUG: bool = False
    API_VERSION: str = "v1"
    SECRET_KEY: str = Field(..., description="JWT signing key")

    # PostgreSQL
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "synapse"
    POSTGRES_PASSWORD: str = Field(..., description="DB password")
    POSTGRES_DB: str = "synapse"

    # Qdrant
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION: str = "synapse_documents"

    # Neo4j
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = Field(..., description="Neo4j password")

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3:8b"
    OLLAMA_TIMEOUT: int = 30

    # Embedding
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIM: int = 768
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 50

    # RBAC / retrieval
    SIMILARITY_THRESHOLD: float = 0.65
    TOP_K_RESULTS: int = 5

    # CORS
    CORS_ORIGINS: CORSOrigins = Field(default_factory=lambda: ["http://localhost:3000"])

    # Session
    SESSION_EXPIRE_HOURS: int = 8

    @property
    def DATABASE_URL(self) -> str:
        """Async SQLAlchemy URL for PostgreSQL (psycopg)."""
        return (
            f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


settings = Settings()
