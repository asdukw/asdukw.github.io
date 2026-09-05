from __future__ import annotations

import re

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Post

CATEGORY_PATTERN = re.compile(r"^(blog|tech)$")
SLUG_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def validate_post_key(category: str, slug: str) -> None:
    if (
        not CATEGORY_PATTERN.fullmatch(category)
        or not SLUG_PATTERN.fullmatch(slug)
        or len(slug) > 255
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_target")


async def find_post(db: AsyncSession, category: str, slug: str) -> Post | None:
    return await db.scalar(select(Post).where(Post.category == category, Post.slug == slug))


async def get_or_create_post(db: AsyncSession, category: str, slug: str) -> Post:
    post = await find_post(db, category, slug)
    if post is not None:
        return post
    post = Post(category=category, slug=slug)
    db.add(post)
    await db.flush()
    return post
