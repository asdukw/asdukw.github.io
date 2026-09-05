from __future__ import annotations

from collections.abc import AsyncGenerator
from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from .config import get_settings


class Base(DeclarativeBase):
    pass


class DatabaseNotConfiguredError(RuntimeError):
    """Raised when the service is started without a Supabase database URL."""


def normalize_database_url(raw_url: str) -> str:
    """Normalize dashboard-style Postgres URLs for SQLAlchemy + asyncpg."""

    url = raw_url.strip()
    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://") :]
    elif url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://") :]

    parsed = urlsplit(url)
    if not parsed.scheme.startswith("postgresql+"):
        return url

    query = parse_qsl(parsed.query, keep_blank_values=True)
    query_dict = dict(query)
    sslmode = query_dict.pop("sslmode", None)
    if sslmode and "ssl" not in query_dict:
        query_dict["ssl"] = "require" if sslmode != "disable" else "disable"

    hostname = (parsed.hostname or "").lower()
    if "supabase" in hostname and "ssl" not in query_dict:
        query_dict["ssl"] = "require"

    return urlunsplit(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            urlencode(query_dict),
            parsed.fragment,
        )
    )


def _is_transaction_pooler(url: str) -> bool:
    parsed = urlsplit(url)
    return parsed.port == 6543


@lru_cache
def get_engine() -> AsyncEngine:
    settings = get_settings()
    if not settings.database_url:
        raise DatabaseNotConfiguredError(
            "DATABASE_URL is not configured. Set it to the Supabase Postgres connection string."
        )

    url = normalize_database_url(settings.database_url)
    engine_kwargs: dict[str, object] = {
        "echo": settings.sql_echo,
        "pool_pre_ping": True,
    }
    # Supabase's transaction-mode pooler must not be wrapped in another pool.
    if _is_transaction_pooler(url):
        engine_kwargs["poolclass"] = NullPool
    return create_async_engine(url, **engine_kwargs)


@lru_cache
def get_session_factory() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(get_engine(), expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with get_session_factory()() as session:
        try:
            yield session
        except BaseException:
            await session.rollback()
            raise


async def dispose_engine() -> None:
    if get_engine.cache_info().currsize:
        await get_engine().dispose()
