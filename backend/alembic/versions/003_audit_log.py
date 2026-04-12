"""Audit log: index query_hash for lookups (Section 7 follow-up)."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "003_audit_log"
down_revision = "002_rbac_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS idx_audit_query_hash "
            "ON audit_logs (query_hash)"
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DROP INDEX IF EXISTS idx_audit_query_hash"))
