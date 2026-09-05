"""Create the initial application schema.

Revision ID: 20260905_0001
Revises:
Create Date: 2026-09-05
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260905_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("github_id", sa.BigInteger(), nullable=False),
        sa.Column("login", sa.String(length=100), nullable=False),
        sa.Column("avatar_url", sa.String(length=500), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("html_url", sa.String(length=500), nullable=False),
        sa.Column("is_admin", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("github_id"),
    )
    op.create_table(
        "auth_sessions",
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("token_hash"),
    )
    op.create_index("ix_auth_sessions_expires_at", "auth_sessions", ["expires_at"], unique=False)
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"], unique=False)

    op.create_table(
        "posts",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("category", "slug", name="uq_posts_category_slug"),
        sa.CheckConstraint("category IN ('blog', 'tech')", name="ck_posts_category"),
    )
    op.create_index("ix_posts_category", "posts", ["category"], unique=False)

    op.create_table(
        "comments",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("post_id", sa.BigInteger(), nullable=False),
        sa.Column("author_id", sa.BigInteger(), nullable=False),
        sa.Column("parent_id", sa.BigInteger(), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default=sa.text("'published'"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_id"], ["comments.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("status IN ('published', 'hidden')", name="ck_comments_status"),
        sa.CheckConstraint("char_length(body) BETWEEN 1 AND 5000", name="ck_comments_body_length"),
    )
    op.create_index("ix_comments_author_id", "comments", ["author_id"], unique=False)
    op.create_index("ix_comments_parent_id", "comments", ["parent_id"], unique=False)
    op.create_index("ix_comments_post_id", "comments", ["post_id"], unique=False)

    op.create_table(
        "comment_reactions",
        sa.Column("comment_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["comment_id"], ["comments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("comment_id", "user_id"),
    )
    op.create_index("ix_comment_reactions_user_id", "comment_reactions", ["user_id"], unique=False)

    op.create_table(
        "bookmarks",
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("post_id", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "post_id"),
    )
    op.create_index("ix_bookmarks_post_id", "bookmarks", ["post_id"], unique=False)

    op.create_table(
        "reading_progress",
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("post_id", sa.BigInteger(), nullable=False),
        sa.Column("progress_percent", sa.SmallInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "post_id"),
        sa.CheckConstraint("progress_percent BETWEEN 0 AND 100", name="ck_reading_progress_range"),
    )
    op.create_index("ix_reading_progress_post_id", "reading_progress", ["post_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_reading_progress_post_id", table_name="reading_progress")
    op.drop_table("reading_progress")
    op.drop_index("ix_bookmarks_post_id", table_name="bookmarks")
    op.drop_table("bookmarks")
    op.drop_index("ix_comment_reactions_user_id", table_name="comment_reactions")
    op.drop_table("comment_reactions")
    op.drop_index("ix_comments_post_id", table_name="comments")
    op.drop_index("ix_comments_parent_id", table_name="comments")
    op.drop_index("ix_comments_author_id", table_name="comments")
    op.drop_table("comments")
    op.drop_index("ix_posts_category", table_name="posts")
    op.drop_table("posts")
    op.drop_index("ix_auth_sessions_user_id", table_name="auth_sessions")
    op.drop_index("ix_auth_sessions_expires_at", table_name="auth_sessions")
    op.drop_table("auth_sessions")
    op.drop_table("users")
