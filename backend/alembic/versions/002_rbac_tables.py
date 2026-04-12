"""RBAC: ensure permission_tags on roles and add GIN index (Section 7 + Step 7).

`permission_tags` is defined on `roles` in 001_initial_schema; this revision
adds the column only if an older database lacked it, then indexes it for
array containment queries.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "002_rbac_tables"
down_revision = "001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "ALTER TABLE roles ADD COLUMN IF NOT EXISTS permission_tags TEXT[] "
            "NOT NULL DEFAULT '{}'::text[]"
        )
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS idx_roles_permission_tags "
            "ON roles USING GIN (permission_tags)"
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DROP INDEX IF EXISTS idx_roles_permission_tags"))
