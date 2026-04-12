#!/usr/bin/env python3
"""Initialize Qdrant collection and payload indexes (SYNAPSE_MASTER_PROMPT.md Section 7)."""

from __future__ import annotations

import sys
from pathlib import Path

import structlog
from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.models import (
    Distance,
    HnswConfigDiff,
    OptimizersConfigDiff,
    PayloadSchemaType,
    TextIndexParams,
    TextIndexType,
    TokenizerType,
    VectorParams,
)

# Resolve backend package (settings)
_BACKEND_ROOT = Path(__file__).resolve().parents[1] / "backend"
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.config import settings  # noqa: E402

logger = structlog.get_logger(__name__)

COLLECTION = settings.QDRANT_COLLECTION


def _client() -> QdrantClient:
    return QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)


def _ensure_collection(client: QdrantClient) -> None:
    if client.collection_exists(COLLECTION):
        logger.info(
            "qdrant_collection_exists_skip_create",
            collection=COLLECTION,
        )
        return

    client.create_collection(
        collection_name=COLLECTION,
        vectors_config=VectorParams(
            size=settings.EMBEDDING_DIM,
            distance=Distance.COSINE,
        ),
        hnsw_config=HnswConfigDiff(
            m=16,
            ef_construct=100,
            full_scan_threshold=10000,
        ),
        optimizers_config=OptimizersConfigDiff(
            indexing_threshold=20000,
        ),
    )
    logger.info("qdrant_collection_created", collection=COLLECTION)


def _ensure_payload_index(
    client: QdrantClient,
    field_name: str,
    field_schema: PayloadSchemaType | TextIndexParams,
) -> None:
    try:
        client.create_payload_index(
            collection_name=COLLECTION,
            field_name=field_name,
            field_schema=field_schema,
        )
        logger.info("qdrant_payload_index_created", field=field_name)
    except UnexpectedResponse as exc:
        raw = exc.content if exc.content else b""
        body = raw.decode("utf-8", errors="replace").lower()
        if (exc.status_code == 409) or "already" in body or "exists" in body:
            logger.info(
                "qdrant_payload_index_exists_skip",
                field=field_name,
                status_code=exc.status_code,
            )
            return
        logger.exception(
            "qdrant_payload_index_failed",
            field=field_name,
            status_code=exc.status_code,
        )
        raise


def main() -> None:
    logger.info(
        "qdrant_init_start",
        host=settings.QDRANT_HOST,
        port=settings.QDRANT_PORT,
        collection=COLLECTION,
    )
    client = _client()
    _ensure_collection(client)

    _ensure_payload_index(
        client,
        "permission_tags",
        PayloadSchemaType.KEYWORD,
    )
    _ensure_payload_index(
        client,
        "source_type",
        PayloadSchemaType.KEYWORD,
    )
    _ensure_payload_index(
        client,
        "author",
        PayloadSchemaType.KEYWORD,
    )
    _ensure_payload_index(
        client,
        "chunk_text",
        TextIndexParams(
            type=TextIndexType.TEXT,
            tokenizer=TokenizerType.WORD,
            min_token_len=2,
            max_token_len=20,
        ),
    )

    logger.info("qdrant_init_complete", collection=COLLECTION)


if __name__ == "__main__":
    main()
