import type { Category } from "@/lib/posts";
import { getAuthApiBase } from "@/lib/auth";

export interface DiscussionAuthor {
  id: string;
  login: string;
  avatarUrl: string;
  name: string | null;
  htmlUrl: string;
}

export interface DiscussionComment {
  id: number;
  nodeId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  parentId: number | null;
  author: DiscussionAuthor | null;
  reactions: {
    thumbsUp: number;
    viewerHasReacted: boolean;
  };
}

export interface Discussion {
  number: number;
  title: string;
  url: string;
  nodeId: string;
  comments: DiscussionComment[];
}

export class DiscussionApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = "DiscussionApiError";
  }
}

interface DiscussionResponse {
  discussion: Discussion | null;
}

interface AddCommentResponse {
  discussion: Pick<Discussion, "number" | "title" | "url">;
  comment: DiscussionComment;
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

function targetPath(category: Category, slug: string): string {
  return `/api/discussions/${encodeURIComponent(category)}/${encodeURIComponent(slug)}`;
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
    throw new DiscussionApiError(response.status, code);
  }

  return data as T;
}

export async function fetchDiscussion(
  category: Category,
  slug: string,
): Promise<Discussion | null> {
  const data = await request<DiscussionResponse>(targetPath(category, slug));
  return data.discussion;
}

export async function addDiscussionComment(
  category: Category,
  slug: string,
  body: string,
): Promise<AddCommentResponse> {
  return request<AddCommentResponse>(`${targetPath(category, slug)}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
}

export async function setDiscussionCommentLike(
  category: Category,
  slug: string,
  commentId: number,
  liked: boolean,
): Promise<LikeResponse> {
  return request<LikeResponse>(
    `${targetPath(category, slug)}/comments/${commentId}/reaction`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liked }),
    },
  );
}
