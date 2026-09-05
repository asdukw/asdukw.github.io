import {
  addDiscussionComment,
  getDiscussion,
  GitHubApiError,
  setDiscussionCommentLike,
  type DiscussionConfig,
} from "../../src/server/discussions";

export interface Env {
  GH_CLIENT_ID: string;
  GH_CLIENT_SECRET: string;
  GH_CALLBACK_URL: string;
  SITE_URL: string;
  GH_REPO_OWNER: string;
  GH_REPO_NAME: string;
  GH_DISCUSSION_CATEGORY: string;
}

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  name: string | null;
  html_url: string;
}

function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

function allowedOrigin(origin: string | null, env: Env): string | null {
  if (!origin) return null;
  const siteHost = new URL(env.SITE_URL).origin;
  return origin === siteHost ? origin : null;
}

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = allowedOrigin(origin, env);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (allowed) {
    headers["Access-Control-Allow-Origin"] = allowed;
    headers["Access-Control-Allow-Credentials"] = "true";
    headers["Vary"] = "Origin";
  }
  return headers;
}

function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(val);
  }
  return cookies;
}

function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

type SameSite = "Lax" | "Strict" | "None";

interface CookieOptions {
  maxAge: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: SameSite;
}

function setCookie(name: string, value: string, options: CookieOptions): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", `Max-Age=${options.maxAge}`];
  if (options.maxAge === 0) parts.push("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

function redirectResponse(location: string, cookies: string[] = []): Response {
  const headers = new Headers({
    Location: location,
    "Cache-Control": "no-store",
  });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

async function exchangeCodeForToken(
  code: string,
  env: Env,
): Promise<GitHubTokenResponse> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.GH_CLIENT_ID,
      client_secret: env.GH_CLIENT_SECRET,
      code,
      redirect_uri: env.GH_CALLBACK_URL,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json() as Promise<GitHubTokenResponse>;
}

async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "asdukw-auth-worker",
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json() as Promise<GitHubUser>;
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const state = generateState();

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", env.GH_CLIENT_ID);
  authorizeUrl.searchParams.set("scope", "read:user write:discussion");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("redirect_uri", env.GH_CALLBACK_URL);

  const cookie = setCookie("gh_oauth_state", state, {
    maxAge: 600,
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  });

  return redirectResponse(authorizeUrl.toString(), [cookie]);
}

async function handleCallback(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return new Response("Missing code or state", { status: 400 });
  }

  const cookies = parseCookies(request.headers.get("Cookie"));
  const savedState = cookies["gh_oauth_state"];

  if (!savedState || savedState !== state) {
    return new Response("Invalid state", { status: 403 });
  }

  try {
    const tokenRes = await exchangeCodeForToken(code, env);
    if (!tokenRes.access_token) {
      return new Response("Failed to get access token", { status: 401 });
    }

    const sessionCookie = setCookie("gh_session", tokenRes.access_token, {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });
    const clearStateCookie = setCookie("gh_oauth_state", "", {
      maxAge: 0,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    });

    return redirectResponse(env.SITE_URL || "/", [sessionCookie, clearStateCookie]);
  } catch (err) {
    console.error("OAuth callback error:", err);
    return new Response("Authentication failed", { status: 500 });
  }
}

async function handleUser(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin");
  const cors = corsHeaders(origin, env);

  const cookies = parseCookies(request.headers.get("Cookie"));
  const token = cookies["gh_session"];

  if (!token) {
    return jsonResponse({ user: null }, 401, cors);
  }

  try {
    const user = await fetchGitHubUser(token);
    return jsonResponse({ user }, 200, cors);
  } catch {
    return jsonResponse({ user: null }, 401, cors);
  }
}

async function handleLogout(
  request: Request,
  env: Env,
): Promise<Response> {
  const clearSession = setCookie("gh_session", "", {
    maxAge: 0,
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });
  const clearState = setCookie("gh_oauth_state", "", {
    maxAge: 0,
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  });

  return redirectResponse(env.SITE_URL || "/", [clearSession, clearState]);
}

interface DiscussionTarget {
  category: string;
  slug: string;
}

interface DiscussionRoute extends DiscussionTarget {
  action: "get" | "comment" | "reaction";
  commentId?: string;
}

function parseDiscussionRoute(pathname: string): DiscussionRoute | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 4 && parts.length !== 5 && parts.length !== 7) return null;
  if (parts[0] !== "api" || parts[1] !== "discussions") {
    return null;
  }

  let category: string;
  let slug: string;
  try {
    category = decodeURIComponent(parts[2] ?? "");
    slug = decodeURIComponent(parts[3] ?? "");
  } catch {
    return null;
  }

  if (!/^(blog|tech)$/.test(category) || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slug)) {
    return null;
  }

  if (parts.length === 4) return { category, slug, action: "get" };
  if (parts.length === 5 && parts[4] === "comments") {
    return { category, slug, action: "comment" };
  }
  if (
    parts.length === 7 &&
    parts[4] === "comments" &&
    parts[6] === "reaction" &&
    /^[0-9]+$/.test(parts[5] ?? "")
  ) {
    return { category, slug, action: "reaction", commentId: parts[5] };
  }
  return null;
}

function discussionConfig(env: Env): DiscussionConfig {
  return {
    owner: env.GH_REPO_OWNER,
    repo: env.GH_REPO_NAME,
    categorySlug: env.GH_DISCUSSION_CATEGORY,
  };
}

function discussionJson(
  request: Request,
  env: Env,
  data: unknown,
  status = 200,
): Response {
  return jsonResponse(data, status, corsHeaders(request.headers.get("Origin"), env));
}

function discussionErrorResponse(
  request: Request,
  env: Env,
  error: unknown,
  missingCode: string,
): Response {
  let status = 502;
  let code = "github_error";

  if (error instanceof GitHubApiError) {
    const message = error.message.toLowerCase();
    if (error.status === 401) {
      status = 401;
      code = "auth_required";
    } else if (
      error.status === 403 ||
      message.includes("resource not accessible") ||
      message.includes("write:discussion") ||
      message.includes("must have push access")
    ) {
      status = 403;
      code = "discussion_permission_required";
    } else if (error.status === 404) {
      status = missingCode === "discussions_unavailable" ? 503 : 404;
      code = missingCode;
    } else if (
      error.status === 410 ||
      message.includes("discussion category") ||
      message.includes("discussions are disabled")
    ) {
      status = 503;
      code = "discussions_unavailable";
    }
  }

  return discussionJson(request, env, { error: code }, status);
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

async function handleDiscussionGet(
  request: Request,
  env: Env,
  target: DiscussionTarget,
): Promise<Response> {
  const token = parseCookies(request.headers.get("Cookie"))["gh_session"];
  try {
    const discussion = await getDiscussion(
      discussionConfig(env),
      target.category,
      target.slug,
      token,
    );
    return discussionJson(request, env, { discussion });
  } catch (error) {
    console.error("Discussion fetch error:", error);
    return discussionErrorResponse(request, env, error, "discussions_unavailable");
  }
}

async function handleDiscussionComment(
  request: Request,
  env: Env,
  target: DiscussionTarget,
): Promise<Response> {
  const token = parseCookies(request.headers.get("Cookie"))["gh_session"];
  if (!token) return discussionJson(request, env, { error: "auth_required" }, 401);

  const body = await readJson(request);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text || text.length > 5000) {
    return discussionJson(request, env, { error: "invalid_comment" }, 400);
  }

  try {
    const result = await addDiscussionComment(
      discussionConfig(env),
      target.category,
      target.slug,
      text,
      token,
    );
    return discussionJson(request, env, result, 201);
  } catch (error) {
    console.error("Discussion comment error:", error);
    return discussionErrorResponse(request, env, error, "discussion_not_found");
  }
}

async function handleDiscussionReaction(
  request: Request,
  env: Env,
  target: DiscussionTarget,
  commentId: string,
): Promise<Response> {
  const token = parseCookies(request.headers.get("Cookie"))["gh_session"];
  if (!token) return discussionJson(request, env, { error: "auth_required" }, 401);

  const numericId = Number(commentId);
  const body = await readJson(request);
  if (!Number.isSafeInteger(numericId) || numericId <= 0 || typeof body?.liked !== "boolean") {
    return discussionJson(request, env, { error: "invalid_reaction" }, 400);
  }

  try {
    const result = await setDiscussionCommentLike(
      discussionConfig(env),
      target.category,
      target.slug,
      numericId,
      body.liked,
      token,
    );
    return discussionJson(request, env, result);
  } catch (error) {
    console.error("Discussion reaction error:", error);
    return discussionErrorResponse(request, env, error, "discussion_not_found");
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }

    if (url.pathname === "/api/auth/login" && request.method === "GET") {
      return handleLogin(request, env);
    }

    if (url.pathname === "/api/auth/callback" && request.method === "GET") {
      return handleCallback(request, env);
    }

    if (url.pathname === "/api/auth/user" && request.method === "GET") {
      return handleUser(request, env);
    }

    if (url.pathname === "/api/auth/logout" && request.method === "GET") {
      return handleLogout(request, env);
    }

    const discussionRoute = parseDiscussionRoute(url.pathname);
    if (discussionRoute?.action === "get" && request.method === "GET") {
      return handleDiscussionGet(request, env, discussionRoute);
    }
    if (discussionRoute?.action === "comment" && request.method === "POST") {
      return handleDiscussionComment(request, env, discussionRoute);
    }
    if (
      discussionRoute?.action === "reaction" &&
      request.method === "POST" &&
      discussionRoute.commentId
    ) {
      return handleDiscussionReaction(request, env, discussionRoute, discussionRoute.commentId);
    }

    return new Response("Not found", { status: 404 });
  },
};
