from fastapi import HTTPException

from app.db import normalize_database_url
from app.main import app
from app.post_keys import validate_post_key
from scripts.import_github_discussions import parse_target


def test_supabase_url_uses_asyncpg_and_tls() -> None:
    url = normalize_database_url(
        "postgres://user:password@db.supabase.co:5432/postgres?sslmode=require"
    )
    assert url == "postgresql+asyncpg://user:password@db.supabase.co:5432/postgres?ssl=require"


def test_post_key_validation() -> None:
    validate_post_key("tech", "bun-react-setup")

    try:
        validate_post_key("private", "bun-react-setup")
    except HTTPException as exc:
        assert exc.status_code == 400
        assert exc.detail == "invalid_target"
    else:
        raise AssertionError("invalid category should be rejected")


def test_openapi_contains_migrated_api() -> None:
    paths = app.openapi()["paths"]
    assert "/api/auth/login" in paths
    assert "/api/discussions/{category}/{slug}" in paths
    assert "/api/me/bookmarks" in paths
    assert "/api/admin/comments/{comment_id}" in paths


def test_discussion_import_only_accepts_site_keys() -> None:
    assert parse_target("Comments: tech/bun-react-setup") == ("tech", "bun-react-setup")
    assert parse_target("General discussion") is None
    assert parse_target("Comments: docs/bun-react-setup") is None
