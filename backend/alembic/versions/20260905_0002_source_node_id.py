"""Add an idempotency key for imported comments.

Revision ID: 20260905_0002
Revises: 20260905_0001
Create Date: 2026-09-05
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260905_0002"
down_revision: str | None = "20260905_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "comments",
        sa.Column("source_node_id", sa.String(length=255), nullable=True),
    )
    op.create_index(
        "ix_comments_source_node_id",
        "comments",
        ["source_node_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_comments_source_node_id", table_name="comments")
    op.drop_column("comments", "source_node_id")
