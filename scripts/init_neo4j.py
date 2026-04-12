#!/usr/bin/env python3
"""Apply Neo4j constraints and indexes (SYNAPSE_MASTER_PROMPT.md Section 7)."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import structlog
from neo4j import AsyncDriver, AsyncGraphDatabase
from neo4j.exceptions import Neo4jError

_BACKEND_ROOT = Path(__file__).resolve().parents[1] / "backend"
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.config import settings  # noqa: E402

logger = structlog.get_logger(__name__)

# Section 7 — Neo4j Graph Schema (order: constraints, then indexes, then fulltext)
CYPHER_STATEMENTS: tuple[str, ...] = (
    "CREATE CONSTRAINT person_email IF NOT EXISTS "
    "FOR (p:Person) REQUIRE p.email IS UNIQUE",
    "CREATE CONSTRAINT document_id IF NOT EXISTS "
    "FOR (d:Document) REQUIRE d.doc_id IS UNIQUE",
    "CREATE CONSTRAINT project_name IF NOT EXISTS "
    "FOR (p:Project) REQUIRE p.name IS UNIQUE",
    "CREATE CONSTRAINT team_name IF NOT EXISTS "
    "FOR (t:Team) REQUIRE t.name IS UNIQUE",
    "CREATE CONSTRAINT ticket_key IF NOT EXISTS "
    "FOR (t:Ticket) REQUIRE t.key IS UNIQUE",
    "CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.name)",
    "CREATE INDEX document_type IF NOT EXISTS FOR (d:Document) ON (d.source_type)",
    "CREATE FULLTEXT INDEX document_content IF NOT EXISTS "
    "FOR (d:Document) ON EACH [d.title, d.summary]",
)


def _is_benign_schema_error(exc: Neo4jError) -> bool:
    """Treat equivalent / already-present schema as success (idempotent runs)."""
    code = getattr(exc, "code", None) or ""
    text = f"{code} {exc!r}".lower()
    markers = (
        "equivalentschemarulealreadyexists",
        "already exists",
        "indexalreadyexists",
        "constraintalreadyexists",
        "equivalentconstraint",
    )
    return any(m in text for m in markers)


async def _apply_schema(driver: AsyncDriver) -> None:
    async with driver.session() as session:
        for cypher in CYPHER_STATEMENTS:
            try:
                result = await session.run(cypher)
                await result.consume()
                logger.info("neo4j_schema_statement_applied", cypher_preview=cypher[:72])
            except Neo4jError as exc:
                if _is_benign_schema_error(exc):
                    logger.info(
                        "neo4j_schema_statement_skipped",
                        reason="already_exists_or_equivalent",
                        code=getattr(exc, "code", None),
                        message=str(exc)[:200],
                    )
                    continue
                logger.exception(
                    "neo4j_schema_statement_failed",
                    cypher_preview=cypher[:72],
                    code=getattr(exc, "code", None),
                )
                raise


async def _run() -> None:
    logger.info(
        "neo4j_init_start",
        uri=settings.NEO4J_URI,
        user=settings.NEO4J_USER,
    )
    driver = AsyncGraphDatabase.driver(
        settings.NEO4J_URI,
        auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
    )
    try:
        await driver.verify_connectivity()
        await _apply_schema(driver)
        logger.info("neo4j_init_complete")
    finally:
        await driver.close()


def main() -> None:
    asyncio.run(_run())


if __name__ == "__main__":
    main()
