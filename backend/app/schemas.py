from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class UserResponse(BaseModel):
    id: int
    login: str
    avatar_url: str
    name: str | None
    html_url: str
    is_admin: bool = False


class AuthorResponse(BaseModel):
    id: str
    login: str
    avatarUrl: str
    name: str | None
    htmlUrl: str


class ReactionSummary(BaseModel):
    thumbsUp: int
    viewerHasReacted: bool


class CommentResponse(BaseModel):
    id: int
    body: str
    createdAt: datetime
    updatedAt: datetime
    parentId: int | None = None
    author: AuthorResponse | None
    reactions: ReactionSummary


class CommentsEnvelope(BaseModel):
    comments: list[CommentResponse]


class AddCommentRequest(BaseModel):
    body: str = Field(min_length=1, max_length=5000)
    parent_id: int | None = Field(default=None, ge=1)

    @field_validator("body")
    @classmethod
    def normalize_body(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Comment body cannot be empty")
        return normalized


class AddCommentResponse(BaseModel):
    comment: CommentResponse


class ReactionRequest(BaseModel):
    liked: bool


class ReactionResponse(BaseModel):
    commentId: int
    liked: bool
    thumbsUp: int


class BookmarkRequest(BaseModel):
    bookmarked: bool


class BookmarkResponse(BaseModel):
    category: str
    slug: str
    bookmarked: bool
    createdAt: datetime | None = None


class ProgressRequest(BaseModel):
    progress: int = Field(ge=0, le=100)


class ProgressResponse(BaseModel):
    category: str
    slug: str
    progress: int
    updatedAt: datetime | None = None


class ModerationRequest(BaseModel):
    status: Literal["published", "hidden"]


class ModerationResponse(BaseModel):
    id: int
    status: Literal["published", "hidden"]
