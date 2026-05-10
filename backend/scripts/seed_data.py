"""Seed demo data for Synapse (Step 54)."""

from __future__ import annotations

import asyncio
import hashlib
import uuid
from datetime import UTC, datetime, timedelta

import structlog
from passlib.context import CryptContext
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.core.embedding import EmbeddingService, load_embedding_model
from app.core.vector_search import VectorSearchService
from app.db.neo4j import close_neo4j, init_neo4j, get_neo4j_driver

logger = structlog.get_logger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SEED_TAG = "demo_seed_v1"


def _db_url_asyncpg() -> str:
    return (
        f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
        f"@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
    )


def _role_rows() -> list[dict[str, object]]:
    return [
        {"name": "ADMIN", "description": "Full system access", "tags": ["*"]},
        {"name": "SENIOR_DEV", "description": "Senior engineer", "tags": ["engineering", "backend"]},
        {"name": "JUNIOR_DEV", "description": "Junior engineer", "tags": ["engineering"]},
        {"name": "PM", "description": "Project manager", "tags": ["pm", "planning"]},
        {"name": "HR", "description": "Human resources", "tags": ["hr"]},
    ]


async def _upsert_roles(session: AsyncSession) -> dict[str, str]:
    role_ids: dict[str, str] = {}
    for row in _role_rows():
        sql = text(
            """
            INSERT INTO roles (name, description, permission_tags)
            VALUES (:name, :description, :tags)
            ON CONFLICT (name)
            DO UPDATE SET
                description = EXCLUDED.description,
                permission_tags = EXCLUDED.permission_tags
            RETURNING id::text
            """
        )
        result = await session.execute(sql, row)
        role_ids[str(row["name"])] = str(result.scalar_one())
    logger.info("seed_roles_upserted", count=len(role_ids))
    return role_ids


async def _upsert_users(session: AsyncSession, role_ids: dict[str, str]) -> dict[str, str]:
    base_password = pwd_context.hash("Demo123!")
    users = [
        {
            "email": "admin@company.com",
            "display_name": "System Admin",
            "role_id": role_ids["ADMIN"],
            "password_hash": pwd_context.hash("Admin123!"),
            "sso_provider": "keycloak",
            "sso_subject_id": "seed-admin",
        },
        {
            "email": "jane.doe@company.com",
            "display_name": "Jane Doe",
            "role_id": role_ids["SENIOR_DEV"],
            "password_hash": base_password,
            "sso_provider": "keycloak",
            "sso_subject_id": "seed-jane",
        },
        {
            "email": "john.smith@company.com",
            "display_name": "John Smith",
            "role_id": role_ids["JUNIOR_DEV"],
            "password_hash": base_password,
            "sso_provider": "keycloak",
            "sso_subject_id": "seed-john",
        },
        {
            "email": "pm@company.com",
            "display_name": "Project Manager",
            "role_id": role_ids["PM"],
            "password_hash": base_password,
            "sso_provider": "keycloak",
            "sso_subject_id": "seed-pm",
        },
    ]

    user_ids: dict[str, str] = {}
    for user in users:
        sql = text(
            """
            INSERT INTO users (
                email, display_name, role_id, sso_provider, sso_subject_id, is_active
            )
            VALUES (:email, :display_name, :role_id, :sso_provider, :sso_subject_id, true)
            ON CONFLICT (email)
            DO UPDATE SET
                display_name = EXCLUDED.display_name,
                role_id = EXCLUDED.role_id,
                sso_provider = EXCLUDED.sso_provider,
                sso_subject_id = EXCLUDED.sso_subject_id,
                is_active = true,
                updated_at = NOW()
            RETURNING id::text
            """
        )
        result = await session.execute(sql, user)
        user_ids[user["email"]] = str(result.scalar_one())
    logger.info("seed_users_upserted", count=len(user_ids))
    return user_ids


async def _upsert_data_sources(session: AsyncSession, user_ids: dict[str, str]) -> dict[str, str]:
    rows = [
        {
            "name": "Engineering Slack",
            "source_type": "slack",
            "config": '{"workspace":"company-eng"}',
            "tags": ["engineering", "backend"],
            "created_by": user_ids["admin@company.com"],
        },
        {
            "name": "Product Planning Docs",
            "source_type": "google_drive",
            "config": '{"folder":"product-planning"}',
            "tags": ["pm", "engineering"],
            "created_by": user_ids["pm@company.com"],
        },
    ]
    source_ids: dict[str, str] = {}
    for row in rows:
        lookup = await session.execute(
            text(
                """
                SELECT id::text
                FROM data_sources
                WHERE name = :name AND source_type = :source_type
                LIMIT 1
                """
            ),
            {"name": row["name"], "source_type": row["source_type"]},
        )
        existing_id = lookup.scalar_one_or_none()
        if existing_id is None:
            await session.execute(
                text(
                    """
                    INSERT INTO data_sources (
                        name, source_type, config, default_permission_tags, status, created_by
                    )
                    VALUES (
                        :name, :source_type, CAST(:config AS JSONB), :tags, 'active', :created_by
                    )
                    """
                ),
                row,
            )
            lookup = await session.execute(
                text(
                    """
                    SELECT id::text
                    FROM data_sources
                    WHERE name = :name AND source_type = :source_type
                    ORDER BY created_at DESC
                    LIMIT 1
                    """
                ),
                {"name": row["name"], "source_type": row["source_type"]},
            )
            existing_id = lookup.scalar_one()

        await session.execute(
            text(
                """
                UPDATE data_sources
                SET config = CAST(:config AS JSONB),
                    default_permission_tags = :tags,
                    status = 'active',
                    created_by = :created_by,
                    updated_at = NOW()
                WHERE id = :id::uuid
                """
            ),
            {
                "id": existing_id,
                "config": row["config"],
                "tags": row["tags"],
                "created_by": row["created_by"],
            },
        )
        source_ids[row["name"]] = str(existing_id)
    logger.info("seed_data_sources_upserted", count=len(source_ids))
    return source_ids


def _seed_vector_documents() -> list[dict[str, object]]:
    docs: list[dict[str, object]] = []
    now = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    sections = [
        (
            "backend troubleshooting",
            ["engineering"],
            "backend",
            [
                "ERR-502-DB is often caused by exhausted database connection pools.",
                "Increase pool size carefully and monitor p95 query latency.",
                "Check Redis queue depth when API latency spikes after deploys.",
                "Retry external dependency calls with exponential backoff and timeout.",
                "Use request IDs to correlate logs across API and worker services.",
            ],
        ),
        (
            "hr policy",
            ["hr"],
            "hr",
            [
                "Annual leave requests must be submitted at least 7 days in advance.",
                "Remote work policy allows up to 3 days per week with manager approval.",
                "Sensitive employee records must only be accessed by HR tagged roles.",
                "Performance review cycles occur bi-annually in June and December.",
                "Harassment and ethics incidents must be reported within 24 hours.",
            ],
        ),
        (
            "project planning",
            ["pm", "engineering"],
            "pm",
            [
                "Roadmap planning starts with quarterly goals and risk assessments.",
                "Define milestones with owners and dependency tracking per sprint.",
                "Weekly status updates include scope, timeline, and blocker changes.",
                "Feature requirements should include measurable acceptance criteria.",
                "Cross-team planning meetings happen every Monday morning.",
            ],
        ),
        (
            "database architecture",
            ["engineering", "backend"],
            "backend",
            [
                "Primary PostgreSQL handles OLTP while replicas serve read-heavy analytics.",
                "Use indexed foreign keys on hot join paths to reduce query planning overhead.",
                "Partition large audit logs by month to keep indexes performant.",
                "Store vectors in PostgreSQL with pgvector and maintain metadata in relational tables.",
                "Neo4j enriches retrieval by linking documents, projects, and authors.",
            ],
        ),
    ]

    for section, tags, source_type, texts in sections:
        for idx, body in enumerate(texts, start=1):
            doc_key = f"{section}-{idx}"
            docs.append(
                {
                    "doc_key": doc_key,
                    "chunk_text": body,
                    "source_url": f"https://seed.local/{section.replace(' ', '-')}/{idx}",
                    "source_type": source_type,
                    "source_id": f"seed-{source_type}",
                    "document_title": f"{section.title()} Guide {idx}",
                    "author": "jane.doe@company.com" if "engineering" in tags else "pm@company.com",
                    "permission_tags": tags,
                    "timestamp": now,
                    "chunk_index": idx,
                    "total_chunks": len(texts),
                    "document_hash": hashlib.sha256(body.encode("utf-8")).hexdigest(),
                }
            )
    return docs


async def _seed_pgvector_chunks() -> None:
    load_embedding_model()
    embedder = EmbeddingService()
    vector_svc = VectorSearchService()
    docs = _seed_vector_documents()
    rows: list[dict[str, object]] = []

    for row in docs:
        vector = embedder.embed(str(row["chunk_text"]))
        chunk_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{SEED_TAG}:{row['doc_key']}"))
        tags_obj = row.get("permission_tags")
        if isinstance(tags_obj, list) and tags_obj:
            tag = str(tags_obj[0])
        else:
            tag = "engineering"
        rows.append(
            {
                "id": chunk_id,
                "chunk_text": str(row["chunk_text"]),
                "source_url": str(row["source_url"]),
                "doc_type": str(row["source_type"]),
                "author": str(row["author"]),
                "timestamp": str(row["timestamp"]),
                "permission_tag": tag,
                "embedding": str(vector),
            }
        )

    await vector_svc.upsert_chunks(rows)
    logger.info("seed_pgvector_upserted", count=len(rows))


async def _seed_neo4j() -> None:
    driver = get_neo4j_driver()
    persons = [
        {"email": "admin@company.com", "name": "System Admin", "title": "Platform Lead"},
        {"email": "jane.doe@company.com", "name": "Jane Doe", "title": "Senior Backend Engineer"},
        {"email": "john.smith@company.com", "name": "John Smith", "title": "Junior Developer"},
        {"email": "pm@company.com", "name": "Product Manager", "title": "Product Manager"},
    ]
    projects = [
        {"name": "Synapse Platform", "description": "Core AI assistant platform"},
        {"name": "Infra Reliability", "description": "Reliability and scaling program"},
    ]
    documents = [
        {
            "doc_id": "seed-doc-1",
            "title": "Backend Troubleshooting Guide",
            "source_type": "slack",
            "source_url": "https://seed.local/backend-troubleshooting/1",
            "summary": "Runbook for backend incidents.",
            "author": "jane.doe@company.com",
            "project": "Synapse Platform",
        },
        {
            "doc_id": "seed-doc-2",
            "title": "HR Policy Handbook",
            "source_type": "google_drive",
            "source_url": "https://seed.local/hr-policy/1",
            "summary": "Internal HR and compliance policies.",
            "author": "pm@company.com",
            "project": "Infra Reliability",
        },
        {
            "doc_id": "seed-doc-3",
            "title": "Project Planning Playbook",
            "source_type": "google_drive",
            "source_url": "https://seed.local/project-planning/1",
            "summary": "Roadmap and milestone planning standards.",
            "author": "pm@company.com",
            "project": "Synapse Platform",
        },
        {
            "doc_id": "seed-doc-4",
            "title": "Database Architecture Overview",
            "source_type": "github",
            "source_url": "https://seed.local/database-architecture/1",
            "summary": "PostgreSQL with pgvector and Neo4j architecture notes.",
            "author": "jane.doe@company.com",
            "project": "Synapse Platform",
        },
        {
            "doc_id": "seed-doc-5",
            "title": "Incident Retrospective Template",
            "source_type": "jira",
            "source_url": "https://seed.local/backend-troubleshooting/5",
            "summary": "Template for post-incident follow-ups.",
            "author": "john.smith@company.com",
            "project": "Infra Reliability",
        },
    ]

    async with driver.session() as session:
        for p in persons:
            await session.run(
                """
                MERGE (person:Person {email: $email})
                SET person.name = $name, person.title = $title
                """,
                p,
            )
        for proj in projects:
            await session.run(
                """
                MERGE (project:Project {name: $name})
                SET project.description = $description
                """,
                proj,
            )
        for doc in documents:
            await session.run(
                """
                MERGE (d:Document {doc_id: $doc_id})
                SET d.title = $title,
                    d.source_type = $source_type,
                    d.source_url = $source_url,
                    d.summary = $summary
                WITH d
                MATCH (p:Person {email: $author})
                MERGE (p)-[:AUTHORED]->(d)
                WITH d
                MATCH (proj:Project {name: $project})
                MERGE (d)-[:MENTIONS]->(proj)
                """,
                doc,
            )
    logger.info("seed_neo4j_upserted", persons=len(persons), documents=len(documents), projects=len(projects))


async def _seed_audit_logs(session: AsyncSession, user_ids: dict[str, str]) -> None:
    await session.execute(
        text(
            """
            DELETE FROM audit_logs
            WHERE details->>'seed_tag' = :seed_tag
            """
        ),
        {"seed_tag": SEED_TAG},
    )

    actions = [
        ("login", "user"),
        ("query", "query"),
        ("role_change", "user"),
        ("source_connect", "data_source"),
        ("query", "query"),
        ("query", "query"),
        ("source_sync", "data_source"),
        ("admin_view", "dashboard"),
        ("query", "query"),
        ("logout", "user"),
    ]
    base_time = datetime.now(UTC) - timedelta(minutes=20)
    rows = []
    user_order = [
        "admin@company.com",
        "jane.doe@company.com",
        "john.smith@company.com",
        "pm@company.com",
    ]
    for i, (action, resource_type) in enumerate(actions):
        email = user_order[i % len(user_order)]
        created_at = (base_time + timedelta(minutes=i)).isoformat()
        qhash = hashlib.sha256(f"seed-query-{i}".encode("utf-8")).hexdigest() if action == "query" else None
        rows.append(
            {
                "user_id": user_ids[email],
                "action": action,
                "resource_type": resource_type,
                "resource_id": f"seed-{resource_type}-{i}",
                "details": f'{{"seed_tag":"{SEED_TAG}","sequence":{i}}}',
                "query_hash": qhash,
                "created_at": created_at,
            }
        )

    for row in rows:
        await session.execute(
            text(
                """
                INSERT INTO audit_logs (
                    user_id, action, resource_type, resource_id, details, query_hash, created_at
                )
                VALUES (
                    :user_id::uuid,
                    :action,
                    :resource_type,
                    :resource_id,
                    CAST(:details AS JSONB),
                    :query_hash,
                    :created_at::timestamptz
                )
                """
            ),
            row,
        )
    logger.info("seed_audit_logs_inserted", count=len(rows))


async def _seed_postgres() -> None:
    engine = create_async_engine(_db_url_asyncpg(), echo=settings.DEBUG)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        role_ids = await _upsert_roles(session)
        user_ids = await _upsert_users(session, role_ids)
        await _upsert_data_sources(session, user_ids)
        await _seed_audit_logs(session, user_ids)
        await session.commit()
    await engine.dispose()


async def _run() -> None:
    logger.info("seed_start")
    await _seed_postgres()

    await init_neo4j()
    try:
        await _seed_pgvector_chunks()
        await _seed_neo4j()
    finally:
        await close_neo4j()
    logger.info("seed_complete")


def main() -> None:
    asyncio.run(_run())


if __name__ == "__main__":
    main()
