"""Seed demo roles, users, mock data source, and run ingestion once (idempotent)."""

from __future__ import annotations

import asyncio
import json
import sys
import uuid
from pathlib import Path

import bcrypt
import structlog
from alembic import command
from alembic.config import Config
from neo4j import AsyncGraphDatabase
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.core.crypto import encrypt_json_credentials
from app.core.embedding import EmbeddingService, load_embedding_model
from app.db.neo4j import close_neo4j, init_neo4j
from app.tasks.ingest import _pipeline

logger = structlog.get_logger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parent.parent


def _hash_password(plain: str) -> str:
    """Bcrypt hash compatible with passlib verification in app.core.auth."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
SEED_SOURCE_ID = uuid.UUID("a1111111-1111-4111-8111-111111111111")

ROLE_ROWS: list[tuple[str, str, list[str]]] = [
    (
        "ADMIN",
        "Full platform access",
        ["public", "engineering", "hr", "pm", "finance", "admin"],
    ),
    ("SENIOR_DEV", "Senior engineer", ["public", "engineering"]),
    ("JUNIOR_DEV", "Junior engineer", ["public", "engineering"]),
    ("PM", "Product management", ["public", "engineering", "pm"]),
    ("HR", "Human resources", ["public", "hr"]),
]

USER_ROWS: list[tuple[str, str, str, str, str]] = [
    ("admin@company.com", "Admin123!", "ADMIN", "Admin", "User"),
    ("alex.senior@company.com", "Demo1234!", "SENIOR_DEV", "Alex", "Senior"),
    ("jamie.junior@company.com", "Demo1234!", "JUNIOR_DEV", "Jamie", "Junior"),
    ("pat.pm@company.com", "Demo1234!", "PM", "Pat", "PM"),
    ("robin.hr@company.com", "Demo1234!", "HR", "Robin", "HR"),
]


def _db_url_async_sqlalchemy() -> str:
    """SQLAlchemy async URL (psycopg v3 uses the ``psycopg_async`` driver name)."""
    u = settings.DATABASE_URL
    if u.startswith("postgresql+psycopg://"):
        return u.replace("postgresql+psycopg://", "postgresql+psycopg_async://", 1)
    if u.startswith("postgresql+asyncpg://"):
        return u
    raise RuntimeError("Unsupported DATABASE_URL for async seed script")


def _run_alembic_upgrade_head() -> None:
    cfg = Config(str(BACKEND_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    command.upgrade(cfg, "head")
    logger.info("alembic_upgrade_complete")


async def _ensure_audit_logs_updated_at(session: AsyncSession) -> None:
    await session.execute(
        text(
            "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS updated_at "
            "timestamptz NOT NULL DEFAULT now()"
        )
    )
    await session.commit()


async def _ensure_user_sessions_is_active(session: AsyncSession) -> None:
    await session.execute(
        text(
            "ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true"
        )
    )
    await session.commit()


async def _ensure_ingestion_jobs_orm_columns(session: AsyncSession) -> None:
    """Align ingestion_jobs with SQLAlchemy IngestionJob model."""
    await session.execute(
        text("ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS chunks_processed integer DEFAULT 0")
    )
    await session.execute(text("ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS error_message text"))
    await session.execute(
        text(
            "ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS updated_at "
            "timestamptz NOT NULL DEFAULT now()"
        )
    )
    await session.commit()


async def _ensure_data_sources_soft_delete_columns(session: AsyncSession) -> None:
    """Align DB with ORM SoftDeleteMixin when columns were not migrated."""
    await session.execute(
        text(
            "ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false"
        )
    )
    await session.execute(
        text("ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS deleted_at timestamptz")
    )
    await session.commit()


async def _ensure_document_chunks_table(session: AsyncSession) -> None:
    """Create pgvector table when missing (not yet in Alembic revisions)."""
    exists = await session.execute(text("SELECT to_regclass('public.document_chunks')"))
    if exists.scalar():
        logger.info("document_chunks_table_exists")
        return

    load_embedding_model()
    dim = len(EmbeddingService().encode("dimension-probe"))
    await session.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    await session.execute(
        text(
            f"""
            CREATE TABLE IF NOT EXISTS document_chunks (
                id TEXT PRIMARY KEY,
                chunk_text TEXT NOT NULL,
                source_url TEXT,
                doc_type TEXT,
                author TEXT,
                timestamp TEXT,
                permission_tag TEXT,
                embedding vector({dim})
            )
            """
        )
    )
    await session.commit()
    logger.info("document_chunks_table_ready", dim=dim)


async def _seed_roles(session: AsyncSession) -> dict[str, uuid.UUID]:
    for name, desc, tags in ROLE_ROWS:
        await session.execute(
            text(
                """
                INSERT INTO roles (name, description, permission_tags, permissions)
                VALUES (
                    :name,
                    :description,
                    CAST(:permission_tags AS text[]),
                    CAST(:permissions AS jsonb)
                )
                ON CONFLICT (name) DO NOTHING
                """
            ),
            {
                "name": name,
                "description": desc,
                "permission_tags": tags,
                "permissions": json.dumps(tags),
            },
        )
    await session.commit()

    res = await session.execute(
        text("SELECT name, id FROM roles WHERE name = ANY(:names)"),
        {"names": [r[0] for r in ROLE_ROWS]},
    )
    rows = {str(r[0]): r[1] for r in res.fetchall()}
    if len(rows) != len(ROLE_ROWS):
        raise RuntimeError(f"expected {len(ROLE_ROWS)} roles, found {len(rows)}")
    logger.info("roles_ready", count=len(rows))
    return rows


async def _seed_users(session: AsyncSession, role_ids: dict[str, uuid.UUID]) -> None:
    for email, password, role_name, first, last in USER_ROWS:
        display = f"{first} {last}"
        await session.execute(
            text(
                """
                INSERT INTO users (
                    email,
                    display_name,
                    password_hash,
                    role_id,
                    first_name,
                    last_name,
                    is_active,
                    is_deleted
                )
                VALUES (
                    :email,
                    :display_name,
                    :password_hash,
                    :role_id,
                    :first_name,
                    :last_name,
                    true,
                    false
                )
                ON CONFLICT (email) DO NOTHING
                """
            ),
            {
                "email": email,
                "display_name": display,
                "password_hash": _hash_password(password),
                "role_id": role_ids[role_name],
                "first_name": first,
                "last_name": last,
            },
        )
    await session.commit()
    logger.info("users_seeded")


async def _seed_data_source(session: AsyncSession, admin_id: uuid.UUID) -> uuid.UUID:
    fixture_dir = "/app/scripts/fixtures/mock_docs"
    enc = encrypt_json_credentials({"fixture_dir": fixture_dir})
    cfg_obj: dict[str, object] = {
        "credentials_enc": enc,
        "sync_schedule": None,
    }
    tags = ["public", "engineering", "hr", "pm"]
    await session.execute(
        text(
            """
            INSERT INTO data_sources (
                id,
                name,
                source_type,
                config,
                default_permission_tags,
                status,
                created_by
            )
            VALUES (
                :id,
                :name,
                :source_type,
                CAST(:config AS jsonb),
                CAST(:tags AS text[]),
                'active',
                :created_by
            )
            ON CONFLICT (id) DO NOTHING
            """
        ),
        {
            "id": SEED_SOURCE_ID,
            "name": "Demo Mock Knowledge Base",
            "source_type": "mock",
            "config": json.dumps(cfg_obj),
            "tags": tags,
            "created_by": admin_id,
        },
    )
    await session.commit()
    logger.info("data_source_seeded", source_id=str(SEED_SOURCE_ID))
    return SEED_SOURCE_ID


async def _get_admin_id(session: AsyncSession) -> uuid.UUID:
    res = await session.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": "admin@company.com"},
    )
    row = res.first()
    if row is None:
        raise RuntimeError("admin@company.com not found after seed")
    return row[0]


async def _count_users(session: AsyncSession) -> int:
    res = await session.execute(text("SELECT COUNT(*) FROM users"))
    return int(res.scalar_one())


async def _count_chunks(session: AsyncSession) -> int:
    res = await session.execute(text("SELECT COUNT(*) FROM document_chunks"))
    return int(res.scalar_one())


async def _count_neo4j_persons() -> int:
    drv = AsyncGraphDatabase.driver(
        settings.NEO4J_URI,
        auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
    )
    try:
        async with drv.session() as neo_session:
            result = await neo_session.run("MATCH (p:Person) RETURN count(p) AS c")
            rec = await result.single()
            if rec is None:
                return 0
            return int(rec["c"])
    finally:
        await drv.close()


async def async_main() -> None:
    logger.info("seed_async_start")

    engine = create_async_engine(_db_url_async_sqlalchemy(), pool_pre_ping=True)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with factory() as session:
        await _ensure_audit_logs_updated_at(session)
        await _ensure_user_sessions_is_active(session)
        await _ensure_ingestion_jobs_orm_columns(session)
        await _ensure_data_sources_soft_delete_columns(session)
        await _ensure_document_chunks_table(session)
        role_ids = await _seed_roles(session)
        await _seed_users(session, role_ids)
        admin_id = await _get_admin_id(session)
        await _seed_data_source(session, admin_id)

    await init_neo4j()
    try:
        logger.info("ingest_start", source_id=str(SEED_SOURCE_ID))
        # Call pipeline coroutine directly (Celery task uses asyncio.run, which fails inside this loop).
        await _pipeline(str(SEED_SOURCE_ID), None)
        logger.info("ingest_complete", source_id=str(SEED_SOURCE_ID))
    finally:
        await close_neo4j()

    async with factory() as session:
        n_users = await _count_users(session)
        try:
            n_chunks = await _count_chunks(session)
        except Exception as exc:
            logger.error("chunk_count_failed", error=str(exc))
            raise RuntimeError(
                "document_chunks table missing or unreadable — ensure pgvector schema exists"
            ) from exc

        await session.execute(
            text(
                """
                INSERT INTO audit_logs (user_id, action, resource_type, details)
                SELECT u.id, 'seed_complete', 'system', CAST('{"source":"seed_demo_data"}' AS jsonb)
                FROM users u WHERE u.email = 'admin@company.com'
                AND NOT EXISTS (SELECT 1 FROM audit_logs WHERE action = 'seed_complete' LIMIT 1)
                """
            )
        )
        await session.commit()

    n_persons = await _count_neo4j_persons()

    if n_chunks <= 200:
        raise RuntimeError(f"expected chunk count > 200, got {n_chunks}")
    if n_persons <= 4:
        raise RuntimeError(f"expected Neo4j Person count > 4, got {n_persons}")

    print("")
    print("========== SEED SUMMARY ==========")
    print(f"{'users_total':<22} | {n_users}")
    print(f"{'document_chunks':<22} | {n_chunks}")
    print(f"{'neo4j_person_nodes':<22} | {n_persons}")
    print(f"{'mock_source_id':<22} | {SEED_SOURCE_ID}")
    print("==================================")
    print("Seed completed successfully.")
    await engine.dispose()


def main() -> None:
    try:
        logger.info("seed_start")
        _run_alembic_upgrade_head()
        asyncio.run(async_main())
    except Exception:
        logger.exception("seed_failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
