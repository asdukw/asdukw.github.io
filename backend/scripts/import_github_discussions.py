from __future__ import annotations

import argparse
import asyncio
import os
from datetime import datetime
from typing import Any

import httpx
from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_session_factory
from app.models import Comment, CommentReaction, Post, User
from app.post_keys import CATEGORY_PATTERN, SLUG_PATTERN

load_dotenv()
load_dotenv("../.env")


GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"
DISCUSSION_PREFIX = "Comments: "


DISCUSSIONS_QUERY = """
query ImportDiscussions($owner: String!, $name: String!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    discussions(first: 100, after: $cursor, orderBy: {field: CREATED_AT, direction: ASC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number
        title
        comments(first: 100) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            databaseId
            body
            createdAt
            updatedAt
            author {
              ... on User {
                databaseId
                login
                avatarUrl
                name
                url
              }
            }
            reactionGroups {
              content
              users(first: 100) {
                nodes {
                  ... on User {
                    databaseId
                    login
                    avatarUrl
                    name
                    url
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
"""


COMMENTS_QUERY = """
query ImportDiscussionComments($owner: String!, $name: String!, $number: Int!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    discussion(number: $number) {
      comments(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          databaseId
          body
          createdAt
          updatedAt
          author {
            ... on User {
              databaseId
              login
              avatarUrl
              name
              url
            }
          }
          reactionGroups {
            content
            users(first: 100) {
              nodes {
                ... on User {
                  databaseId
                  login
                  avatarUrl
                  name
                  url
                }
              }
            }
          }
        }
      }
    }
  }
}
"""


def parse_target(title: str) -> tuple[str, str] | None:
    if not title.startswith(DISCUSSION_PREFIX):
        return None
    target = title[len(DISCUSSION_PREFIX) :]
    category, separator, slug = target.partition("/")
    if (
        not separator
        or not CATEGORY_PATTERN.fullmatch(category)
        or not SLUG_PATTERN.fullmatch(slug)
        or len(slug) > 255
    ):
        return None
    return category, slug


def parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


async def graphql(
    client: httpx.AsyncClient,
    token: str,
    query: str,
    variables: dict[str, Any],
) -> dict[str, Any]:
    response = await client.post(
        GITHUB_GRAPHQL_URL,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "asdukw-discussion-import",
        },
        json={"query": query, "variables": variables},
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("errors"):
        messages = "; ".join(str(error.get("message", "GraphQL error")) for error in payload["errors"])
        raise RuntimeError(messages)
    data = payload.get("data")
    if not isinstance(data, dict):
        raise RuntimeError("GitHub GraphQL response did not contain data")
    return data


async def get_or_create_user(db: AsyncSession, raw: dict[str, Any]) -> User | None:
    github_id = raw.get("databaseId")
    login = raw.get("login")
    if not isinstance(github_id, int) or not isinstance(login, str):
        return None

    user = await db.scalar(select(User).where(User.github_id == github_id))
    if user is None:
        user = User(
            github_id=github_id,
            login=login,
            avatar_url=str(raw.get("avatarUrl") or ""),
            name=raw.get("name") if isinstance(raw.get("name"), str) else None,
            html_url=str(raw.get("url") or ""),
        )
        db.add(user)
        await db.flush()
    else:
        user.login = login
        user.avatar_url = str(raw.get("avatarUrl") or "")
        user.name = raw.get("name") if isinstance(raw.get("name"), str) else None
        user.html_url = str(raw.get("url") or "")
    return user


async def import_reactions(
    db: AsyncSession,
    comment: Comment,
    reaction_groups: list[dict[str, Any]],
) -> int:
    imported = 0
    for group in reaction_groups:
        if group.get("content") != "THUMBS_UP":
            continue
        users = group.get("users", {}).get("nodes", [])
        if not isinstance(users, list):
            continue
        for raw_user in users:
            if not isinstance(raw_user, dict):
                continue
            user = await get_or_create_user(db, raw_user)
            if user is None:
                continue
            exists = await db.scalar(
                select(CommentReaction).where(
                    CommentReaction.comment_id == comment.id,
                    CommentReaction.user_id == user.id,
                )
            )
            if exists is None:
                db.add(CommentReaction(comment_id=comment.id, user_id=user.id))
                imported += 1
    return imported


async def import_comment(
    db: AsyncSession,
    post: Post,
    raw_comment: dict[str, Any],
    token: str,
) -> tuple[bool, int]:
    source_node_id = raw_comment.get("id")
    body = raw_comment.get("body")
    created_at = raw_comment.get("createdAt")
    updated_at = raw_comment.get("updatedAt")
    raw_author = raw_comment.get("author")
    if not isinstance(source_node_id, str) or not isinstance(body, str):
        return False, 0
    if not isinstance(created_at, str) or not isinstance(updated_at, str):
        return False, 0
    if not isinstance(raw_author, dict):
        print(f"skip comment without a user: {source_node_id}")
        return False, 0

    author = await get_or_create_user(db, raw_author)
    if author is None:
        return False, 0

    comment = await db.scalar(select(Comment).where(Comment.source_node_id == source_node_id))
    if comment is None:
        comment = Comment(
            post_id=post.id,
            author_id=author.id,
            source_node_id=source_node_id,
            body=body,
            status="published",
            created_at=parse_timestamp(created_at),
            updated_at=parse_timestamp(updated_at),
        )
        db.add(comment)
        await db.flush()
        is_new = True
    else:
        comment.post_id = post.id
        comment.author_id = author.id
        comment.body = body
        comment.updated_at = parse_timestamp(updated_at)
        is_new = False

    reaction_count = await import_reactions(
        db,
        comment,
        raw_comment.get("reactionGroups", []),
    )
    return is_new, reaction_count


async def import_repository(owner: str, repo: str, token: str) -> None:
    session_factory = get_session_factory()
    imported_comments = 0
    imported_reactions = 0
    skipped_discussions = 0
    cursor: str | None = None

    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            data = await graphql(
                client,
                token,
                DISCUSSIONS_QUERY,
                {"owner": owner, "name": repo, "cursor": cursor},
            )
            discussions = data.get("repository", {}).get("discussions")
            if not isinstance(discussions, dict):
                raise RuntimeError("GitHub repository does not expose Discussions")

            async with session_factory() as db:
                for discussion in discussions.get("nodes", []):
                    if not isinstance(discussion, dict):
                        continue
                    target = parse_target(str(discussion.get("title", "")))
                    if target is None:
                        skipped_discussions += 1
                        continue
                    category, slug = target
                    post = await db.scalar(
                        select(Post).where(Post.category == category, Post.slug == slug)
                    )
                    if post is None:
                        post = Post(category=category, slug=slug)
                        db.add(post)
                        await db.flush()

                    async def import_comment_page(
                        comments: dict[str, Any],
                    ) -> None:
                        nonlocal imported_comments, imported_reactions
                        for raw_comment in comments.get("nodes", []):
                            if not isinstance(raw_comment, dict):
                                continue
                            is_new, reaction_count = await import_comment(
                                db, post, raw_comment, token
                            )
                            imported_comments += int(is_new)
                            imported_reactions += reaction_count

                    comments = discussion.get("comments", {})
                    if not isinstance(comments, dict):
                        comments = {}
                    await import_comment_page(comments)

                    comment_page_info = comments.get("pageInfo", {})
                    if not isinstance(comment_page_info, dict):
                        comment_page_info = {}
                    comment_cursor = comment_page_info.get("endCursor")
                    while comment_page_info.get("hasNextPage"):
                        discussion_number = discussion.get("number")
                        if not isinstance(discussion_number, int):
                            raise RuntimeError("GitHub returned a discussion without a number")
                        comment_data = await graphql(
                            client,
                            token,
                            COMMENTS_QUERY,
                            {
                                "owner": owner,
                                "name": repo,
                                "number": discussion_number,
                                "cursor": comment_cursor,
                            },
                        )
                        comment_connection = (
                            comment_data.get("repository", {})
                            .get("discussion", {})
                            .get("comments", {})
                        )
                        if not isinstance(comment_connection, dict):
                            raise RuntimeError("GitHub returned an invalid comment page")
                        await import_comment_page(comment_connection)
                        comment_page_info = comment_connection.get("pageInfo", {})
                        if not isinstance(comment_page_info, dict):
                            comment_page_info = {}
                        comment_cursor = comment_page_info.get("endCursor")
                await db.commit()

            page_info = discussions.get("pageInfo", {})
            if not page_info.get("hasNextPage"):
                break
            cursor = page_info.get("endCursor")
            if not isinstance(cursor, str):
                raise RuntimeError("GitHub returned a missing pagination cursor")

    print(
        "Imported "
        f"{imported_comments} comments and {imported_reactions} thumbs-up reactions; "
        f"skipped {skipped_discussions} non-site discussions."
    )


def parse_args() -> argparse.Namespace:
    settings = get_settings()
    parser = argparse.ArgumentParser(
        description="Import the site's GitHub Discussions into the FastAPI database."
    )
    parser.add_argument("--owner", default="asdukw")
    parser.add_argument("--repo", default="asdukw.github.io")
    parser.add_argument(
        "--token-env",
        default="GITHUB_MIGRATION_TOKEN",
        help="Environment variable containing a GitHub token with Discussions read access.",
    )
    parser.set_defaults(database_configured=bool(settings.database_url))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.database_configured:
        raise SystemExit("DATABASE_URL is not configured; run Alembic first.")
    token = os.getenv(args.token_env)
    if not token:
        raise SystemExit(
            f"{args.token_env} is not configured; refusing to run without a GitHub token."
        )
    asyncio.run(import_repository(args.owner, args.repo, token))


if __name__ == "__main__":
    main()
