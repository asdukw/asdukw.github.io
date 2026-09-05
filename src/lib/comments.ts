import type { Category } from "@/lib/posts";
import { getAuthApiBase } from "@/lib/auth";

export interface CommentAuthor {
  id: string;
  login: string;
  avatarUrl: string;
  name: string | null;
  htmlUrl: string;
}

export interface ArticleComment {
  id: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  parentId: number | null;
  author: CommentAuthor | null;
  reactions: {
    thumbsUp: number;
    viewerHasReacted: boolean;
  };
}

export interface CommentsEnvelope {
  comments: ArticleComment[];
}

export class CommentsApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = "CommentsApiError";
  }
}

interface AddCommentResponse {
  comment: ArticleComment;
}

interface LikeResponse {
  commentId: number;
  liked: boolean;
  thumbsUp: number;
}

let csrfBase: string | null = null;
let csrfToken: string | null = null;

async function getCsrfToken(base: string): Promise<string | null> {
  if (csrfBase !== base) {
    csrfBase = base;
    csrfToken = null;
  }
  if (csrfToken) return csrfToken;

  try {
    const response = await fetch(`${base}/api/auth/csrf`, {
      credentials: "include",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { token?: unknown };
    csrfToken = typeof data.token === "string" ? data.token : null;
    return csrfToken;
  } catch {
    return null;
  }
}

function commentsPath(category: Category, slug: string): string {
  return `/api/comments/${encodeURIComponent(category)}/${encodeURIComponent(slug)}`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = getAuthApiBase();
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const token = await getCsrfToken(base);
    if (token) headers.set("X-CSRF-Token", token);
  }
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Keep the status code when the server does not return JSON.
  }

  if (!response.ok) {
    const code =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error?: unknown }).error ?? "request_failed")
        : typeof data === "object" && data !== null && "detail" in data
          ? String((data as { detail?: unknown }).detail ?? "request_failed")
          : "request_failed";
    throw new CommentsApiError(response.status, code);
  }

  return data as T;
}

export async function fetchComments(
  category: Category,
  slug: string,
): Promise<ArticleComment[]> {
  const data = await request<CommentsEnvelope>(commentsPath(category, slug));
  return data.comments;
}

export async function addComment(
  category: Category,
  slug: string,
  body: string,
): Promise<AddCommentResponse> {
  return request<AddCommentResponse>(`${commentsPath(category, slug)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
}

export async function setCommentLike(
  category: Category,
  slug: string,
  commentId: number,
  liked: boolean,
): Promise<LikeResponse> {
  return request<LikeResponse>(
    `${commentsPath(category, slug)}/${commentId}/reaction`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liked }),
    },
  );
}
