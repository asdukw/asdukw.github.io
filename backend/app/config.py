from __future__ import annotations

import json
from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables.

    The aliases keep the existing GH_* variables usable during the migration,
    while the GITHUB_* names are the canonical names for the FastAPI service.
    """

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "asdukw API"
    environment: str = "development"
    database_url: str = Field(
        default="",
        validation_alias=AliasChoices("DATABASE_URL", "SUPABASE_DB_URL"),
    )
    sql_echo: bool = False

    site_url: str = Field(default="http://localhost:3000", validation_alias="SITE_URL")
    github_client_id: str = Field(
        default="",
        validation_alias=AliasChoices("GITHUB_CLIENT_ID", "GH_CLIENT_ID"),
    )
    github_client_secret: str = Field(
        default="",
        validation_alias=AliasChoices("GITHUB_CLIENT_SECRET", "GH_CLIENT_SECRET"),
    )
    github_callback_url: str = Field(
        default="http://localhost:8000/api/auth/callback",
        validation_alias=AliasChoices("GITHUB_CALLBACK_URL", "GH_CALLBACK_URL"),
    )
    admin_github_id: int | None = Field(
        default=None,
        validation_alias=AliasChoices("ADMIN_GITHUB_ID", "BUN_PUBLIC_ADMIN_USER_ID"),
    )

    cors_origins: str = "http://localhost:3000"
    session_cookie_name: str = "site_session"
    session_ttl_days: int = 30
    session_cookie_secure: bool = Field(
        default=False,
        validation_alias=AliasChoices("SESSION_COOKIE_SECURE", "COOKIE_SECURE"),
    )
    session_cookie_samesite: Literal["lax", "strict", "none"] = Field(
        default="lax",
        validation_alias=AliasChoices("SESSION_COOKIE_SAMESITE", "COOKIE_SAMESITE"),
    )
    session_cookie_domain: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SESSION_COOKIE_DOMAIN", "COOKIE_DOMAIN"),
    )

    @property
    def cors_origin_list(self) -> list[str]:
        raw = self.cors_origins.strip()
        if not raw:
            return []
        if raw.startswith("["):
            try:
                values = json.loads(raw)
            except json.JSONDecodeError:
                values = []
            if isinstance(values, list):
                return [str(value).rstrip("/") for value in values if str(value).strip()]
        return [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]

    @property
    def normalized_site_url(self) -> str:
        return self.site_url.rstrip("/")


@lru_cache
def get_settings() -> Settings:
    return Settings()
