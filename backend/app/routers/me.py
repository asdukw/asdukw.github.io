from __future__ import annotations

from fastapi import APIRouter, Depends, Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..auth import require_csrf, require_user
from ..db import get_db
from ..models import Bookmark, ReadingProgress, User
from ..post_keys import find_post, get_or_create_post, validate_post_key
from ..schemas import (
    BookmarkRequest,
    BookmarkResponse,
    ProgressRequest,
    ProgressResponse,
)

router = APIRouter(prefix="/api/me", tags=["account"])


@router.get("/bookmarks", response_model=list[BookmarkResponse])
async def list_bookmarks(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
) -> list[BookmarkResponse]:
    result = await db.execute(
        select(Bookmark)
        .options(selectinload(Bookmark.post))
        .where(Bookmark.user_id == user.id)
        .order_by(Bookmark.created_at.desc())
    )
    return [
        BookmarkResponse(
            category=bookmark.post.category,
            slug=bookmark.post.slug,
            bookmarked=True,
            createdAt=bookmark.created_at,
        )
        for bookmark in result.scalars().all()
    ]


@router.put(
    "/bookmarks/{category}/{slug}",
    response_model=BookmarkResponse,
)
async def set_bookmark(
    payload: BookmarkRequest,
    category: str = Path(...),
    slug: str = Path(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
    _: None = Depends(require_csrf),
) -> BookmarkResponse:
    validate_post_key(category, slug)
    post = await get_or_create_post(db, category, slug)
    bookmark = await db.scalar(
        select(Bookmark).where(
            Bookmark.user_id == user.id,
            Bookmark.post_id == post.id,
        )
    )
    if payload.bookmarked and bookmark is None:
        bookmark = Bookmark(user_id=user.id, post_id=post.id)
        db.add(bookmark)
    elif not payload.bookmarked and bookmark is not None:
        await db.delete(bookmark)
        bookmark = None
    await db.commit()
    if bookmark is not None:
        await db.refresh(bookmark)
    return BookmarkResponse(
        category=category,
        slug=slug,
        bookmarked=payload.bookmarked,
        createdAt=bookmark.created_at if bookmark else None,
    )


@router.get(
    "/progress/{category}/{slug}",
    response_model=ProgressResponse,
)
async def get_progress(
    category: str = Path(...),
    slug: str = Path(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
) -> ProgressResponse:
    validate_post_key(category, slug)
    post = await find_post(db, category, slug)
    progress = None
    if post is not None:
        progress = await db.scalar(
            select(ReadingProgress).where(
                ReadingProgress.user_id == user.id,
                ReadingProgress.post_id == post.id,
            )
        )
    return ProgressResponse(
        category=category,
        slug=slug,
        progress=progress.progress_percent if progress else 0,
        updatedAt=progress.updated_at if progress else None,
    )


@router.put(
    "/progress/{category}/{slug}",
    response_model=ProgressResponse,
)
async def set_progress(
    payload: ProgressRequest,
    category: str = Path(...),
    slug: str = Path(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
    _: None = Depends(require_csrf),
) -> ProgressResponse:
    validate_post_key(category, slug)
    post = await get_or_create_post(db, category, slug)
    progress = await db.scalar(
        select(ReadingProgress).where(
            ReadingProgress.user_id == user.id,
            ReadingProgress.post_id == post.id,
        )
    )
    if progress is None:
        progress = ReadingProgress(
            user_id=user.id,
            post_id=post.id,
            progress_percent=payload.progress,
        )
        db.add(progress)
    else:
        progress.progress_percent = payload.progress
    await db.commit()
    await db.refresh(progress)
    return ProgressResponse(
        category=category,
        slug=slug,
        progress=progress.progress_percent,
        updatedAt=progress.updated_at,
    )
