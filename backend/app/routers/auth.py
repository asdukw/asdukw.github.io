from __future__ import annotations

import secrets
from urllib.parse import quote, urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import (
    CSRF_COOKIE_NAME,
    create_session,
    get_current_user_optional,
    hash_session_token,
    serialize_user,
)
from ..config import Settings, get_settings
from ..db import get_db
from ..models import AuthSession, User

router = APIRouter(prefix="/api/auth", tags=["auth"])
OAUTH_STATE_COOKIE = "oauth_state"


def _redirect_with_error(settings: Settings, code: str) -> RedirectResponse:
    location = f"{settings.normalized_site_url}/?auth_error={quote(code)}"
    return RedirectResponse(url=location, status_code=status.HTTP_302_FOUND)


@router.get("/login")
async def login(settings: Settings = Depends(get_settings)) -> RedirectResponse:
    if (
        not settings.github_client_id
        or not settings.github_client_secret
        or not settings.github_callback_url
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="github_oauth_not_configured",
        )

    state = secrets.token_urlsafe(32)
    query = urlencode(
        {
            "client_id": settings.github_client_id,
            "redirect_uri": settings.github_callback_url,
            "scope": "read:user",
            "state": state,
        }
    )
    response = RedirectResponse(
        url=f"https://github.com/login/oauth/authorize?{query}",
        status_code=status.HTTP_302_FOUND,
    )
    response.set_cookie(
        key=OAUTH_STATE_COOKIE,
        value=state,
        max_age=600,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
        domain=settings.session_cookie_domain,
    )
    return response


@router.get("/callback", response_model=None)
async def callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> RedirectResponse | JSONResponse:
    if error:
        response = _redirect_with_error(settings, "github_denied")
        response.delete_cookie(
            key=OAUTH_STATE_COOKIE,
            path="/",
            domain=settings.session_cookie_domain,
        )
        return response
    if not code or not state:
        return JSONResponse({"error": "missing_code_or_state"}, status_code=400)

    saved_state = request.cookies.get(OAUTH_STATE_COOKIE)
    if not saved_state or not secrets_compare(saved_state, state):
        return JSONResponse({"error": "invalid_state"}, status_code=403)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                json={
                    "client_id": settings.github_client_id,
                    "client_secret": settings.github_client_secret,
                    "code": code,
                    "redirect_uri": settings.github_callback_url,
                },
                headers={"Accept": "application/json"},
            )
            token_response.raise_for_status()
            token_payload = token_response.json()
            access_token = token_payload.get("access_token")
            if not isinstance(access_token, str) or not access_token:
                return _redirect_with_error(settings, "token_exchange_failed")

            user_response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Accept": "application/vnd.github+json",
                    "Authorization": f"Bearer {access_token}",
                    "User-Agent": "asdukw-api",
                },
            )
            user_response.raise_for_status()
            github_user = user_response.json()

        github_id = github_user.get("id")
        login_name = github_user.get("login")
        if not isinstance(github_id, int) or not isinstance(login_name, str):
            return _redirect_with_error(settings, "invalid_github_user")

        user = await db.scalar(select(User).where(User.github_id == github_id))
        is_admin = settings.admin_github_id is not None and github_id == settings.admin_github_id
        if user is None:
            user = User(
                github_id=github_id,
                login=login_name,
                avatar_url=str(github_user.get("avatar_url") or ""),
                name=github_user.get("name"),
                html_url=str(github_user.get("html_url") or ""),
                is_admin=is_admin,
            )
            db.add(user)
            await db.flush()
        else:
            user.login = login_name
            user.avatar_url = str(github_user.get("avatar_url") or "")
            user.name = github_user.get("name")
            user.html_url = str(github_user.get("html_url") or "")
            user.is_admin = is_admin

        session_token = await create_session(db, user.id, settings)
        await db.commit()
    except (httpx.HTTPError, ValueError) as exc:
        print(f"GitHub OAuth callback failed: {exc}")
        return _redirect_with_error(settings, "authentication_failed")

    response = RedirectResponse(
        url=settings.normalized_site_url,
        status_code=status.HTTP_302_FOUND,
    )
    response.delete_cookie(
        key=OAUTH_STATE_COOKIE,
        path="/",
        domain=settings.session_cookie_domain,
    )
    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_token,
        max_age=settings.session_ttl_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        path="/",
        domain=settings.session_cookie_domain,
    )
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=secrets.token_urlsafe(32),
        max_age=settings.session_ttl_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        path="/",
        domain=settings.session_cookie_domain,
    )
    return response


def secrets_compare(left: str, right: str) -> bool:
    return secrets.compare_digest(left, right)


@router.get("/csrf")
async def csrf_token(settings: Settings = Depends(get_settings)) -> JSONResponse:
    token = secrets.token_urlsafe(32)
    response = JSONResponse({"token": token})
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=token,
        max_age=settings.session_ttl_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        path="/",
        domain=settings.session_cookie_domain,
    )
    return response


@router.get("/user")
async def current_user(
    user: User | None = Depends(get_current_user_optional),
) -> dict[str, object | None]:
    return {"user": serialize_user(user) if user else None}


@router.get("/logout")
async def logout(
    request: Request,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> RedirectResponse:
    raw_token = request.cookies.get(settings.session_cookie_name)
    if raw_token:
        session = await db.get(AuthSession, hash_session_token(raw_token))
        if session is not None:
            await db.delete(session)
            await db.commit()

    response = RedirectResponse(
        url=settings.normalized_site_url,
        status_code=status.HTTP_302_FOUND,
    )
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        domain=settings.session_cookie_domain,
    )
    response.delete_cookie(
        key=OAUTH_STATE_COOKIE,
        path="/",
        domain=settings.session_cookie_domain,
    )
    response.delete_cookie(
        key=CSRF_COOKIE_NAME,
        path="/",
        domain=settings.session_cookie_domain,
    )
    return response
