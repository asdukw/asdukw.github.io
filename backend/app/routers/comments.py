from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..auth import get_current_user_optional, require_csrf, require_user
from ..db import get_db
from ..models import Comment, CommentReaction, Post, User
from ..post_keys import find_post, get_or_create_post, validate_post_key
from ..schemas import (
    AddCommentRequest,
    AddCommentResponse,
    AuthorResponse,
    CommentResponse,
    DiscussionEnvelope,
    DiscussionReference,
    DiscussionResponse,
    ReactionRequest,
    ReactionResponse,
    ReactionSummary,
)

router = APIRouter(prefix="/api/discussions", tags=["comments"])


def author_response(user: User | None) -> AuthorResponse | None:
    if user is None:
        return None
    return AuthorResponse(
        id=str(user.id),
        login=user.login,
        avatarUrl=user.avatar_url,
        name=user.name,
        htmlUrl=user.html_url,
    )


def comment_response(
    comment: Comment,
    liked: bool = False,
    thumbs_up: int | None = None,
) -> CommentResponse:
    return CommentResponse(
        id=comment.id,
        nodeId=str(comment.id),
        body=comment.body,
        createdAt=comment.created_at,
        updatedAt=comment.updated_at,
        url="",
        parentId=comment.parent_id,
        author=author_response(comment.author),
        reactions=ReactionSummary(
            thumbsUp=thumbs_up if thumbs_up is not None else len(comment.reactions),
            viewerHasReacted=liked,
        ),
    )


def discussion_reference(post: Post, category: str, slug: str) -> DiscussionReference:
    return DiscussionReference(
        number=0,
        title=f"Comments: {category}/{slug}",
        url="",
        nodeId=f"post:{post.id}",
    )


async def load_reactions_for_viewer(
    db: AsyncSession,
    comments: list[Comment],
    user: User | None,
) -> set[int]:
    if user is None or not comments:
        return set()
    ids = [comment.id for comment in comments]
    result = await db.scalars(
        select(CommentReaction.comment_id).where(
            CommentReaction.user_id == user.id,
            CommentReaction.comment_id.in_(ids),
        )
    )
    return set(result.all())


@router.get(
    "/{category}/{slug}",
    response_model=DiscussionEnvelope,
)
async def get_comments(
    category: str = Path(...),
    slug: str = Path(...),
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> DiscussionEnvelope:
    validate_post_key(category, slug)
    post = await find_post(db, category, slug)
    if post is None:
        return DiscussionEnvelope(discussion=None)

    result = await db.execute(
        select(Comment)
        .options(selectinload(Comment.author), selectinload(Comment.reactions))
        .where(Comment.post_id == post.id, Comment.status == "published")
        .order_by(Comment.created_at.asc(), Comment.id.asc())
    )
    comments = list(result.scalars().all())
    liked_ids = await load_reactions_for_viewer(db, comments, user)
    return DiscussionEnvelope(
        discussion=DiscussionResponse(
            **discussion_reference(post, category, slug).model_dump(),
            comments=[comment_response(comment, comment.id in liked_ids) for comment in comments],
        )
    )


@router.post(
    "/{category}/{slug}/comments",
    response_model=AddCommentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_comment(
    payload: AddCommentRequest,
    category: str = Path(...),
    slug: str = Path(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
    _: None = Depends(require_csrf),
) -> AddCommentResponse:
    validate_post_key(category, slug)
    post = await get_or_create_post(db, category, slug)

    parent_id = payload.parent_id
    if parent_id is not None:
        parent = await db.scalar(
            select(Comment).where(Comment.id == parent_id, Comment.post_id == post.id)
        )
        if parent is None or parent.status != "published":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_parent")

    comment = Comment(
        post_id=post.id,
        author_id=user.id,
        parent_id=parent_id,
        body=payload.body,
        status="published",
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    comment.author = user
    return AddCommentResponse(
        discussion=discussion_reference(post, category, slug),
        comment=comment_response(comment, thumbs_up=0),
    )


@router.post(
    "/{category}/{slug}/comments/{comment_id}/reaction",
    response_model=ReactionResponse,
)
async def set_comment_reaction(
    payload: ReactionRequest,
    comment_id: int = Path(..., ge=1),
    category: str = Path(...),
    slug: str = Path(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
    _: None = Depends(require_csrf),
) -> ReactionResponse:
    validate_post_key(category, slug)
    comment = await db.scalar(
        select(Comment)
        .join(Post)
        .where(
            Comment.id == comment_id,
            Comment.post_id == Post.id,
            Post.category == category,
            Post.slug == slug,
            Comment.status == "published",
        )
    )
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="comment_not_found")

    existing = await db.scalar(
        select(CommentReaction).where(
            CommentReaction.comment_id == comment_id,
            CommentReaction.user_id == user.id,
        )
    )
    if payload.liked and existing is None:
        db.add(CommentReaction(comment_id=comment_id, user_id=user.id))
    elif not payload.liked and existing is not None:
        await db.delete(existing)
    await db.commit()

    count = await db.scalar(
        select(func.count(CommentReaction.comment_id)).where(
            CommentReaction.comment_id == comment_id
        )
    )
    return ReactionResponse(
        commentId=comment_id,
        liked=payload.liked,
        thumbsUp=int(count or 0),
    )
