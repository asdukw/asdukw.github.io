from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from .config import Settings, get_settings
from .db import get_db
from .models import AuthSession, User

CSRF_COOKIE_NAME = "csrf_token"


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def serialize_user(user: User) -> dict[str, object]:
    return {
        "id": user.github_id,
        "login": user.login,
        "avatar_url": user.avatar_url,
        "name": user.name,
        "html_url": user.html_url,
        "is_admin": user.is_admin,
    }


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


async def create_session(
    db: AsyncSession,
    user_id: int,
    settings: Settings,
) -> str:
    raw_token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.session_ttl_days)
    db.add(
        AuthSession(
            token_hash=hash_session_token(raw_token),
            user_id=user_id,
            expires_at=expires_at,
        )
    )
    return raw_token


async def get_current_user_optional(
    request: Request,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> User | None:
    raw_token = request.cookies.get(settings.session_cookie_name)
    if not raw_token:
        return None

    session = await db.get(AuthSession, hash_session_token(raw_token))
    if session is None:
        return None
    if _utc(session.expires_at) <= datetime.now(timezone.utc):
        await db.delete(session)
        await db.commit()
        return None

    return await db.get(User, session.user_id)


async def require_user(
    user: User | None = Depends(get_current_user_optional),
) -> User:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="auth_required")
    return user


async def require_admin(user: User = Depends(require_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin_required")
    return user


async def require_csrf(request: Request) -> None:
    """Require a double-submit token for cookie-authenticated write requests."""

    cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
    header_token = request.headers.get("X-CSRF-Token")
    if (
        not cookie_token
        or not header_token
        or not secrets.compare_digest(cookie_token, header_token)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="csrf_failed")
