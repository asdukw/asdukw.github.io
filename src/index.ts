import { serve } from "bun";
import index from "./index.html";
import {
  addDiscussionComment,
  getDiscussion,
  GitHubApiError,
  setDiscussionCommentLike,
  type DiscussionConfig,
} from "./server/discussions";

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

function setCookie(
  name: string,
  value: string,
  maxAge: number,
  extra: string[] = [],
): string {
  return [`${name}=${encodeURIComponent(value)}`, "Path=/", "SameSite=Lax", `Max-Age=${maxAge}`, ...extra].join("; ");
}

async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string }> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GH_CLIENT_ID,
      client_secret: process.env.GH_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json() as Promise<{ access_token: string }>;
}

async function fetchGitHubUser(token: string) {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "asdukw-auth",
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

function localDiscussionConfig(): DiscussionConfig {
  return {
    owner: process.env.GH_REPO_OWNER || "asdukw",
    repo: process.env.GH_REPO_NAME || "asdukw.github.io",
    categorySlug: process.env.GH_DISCUSSION_CATEGORY || "general",
  };
}

function validDiscussionTarget(category: string, slug: string): boolean {
  return /^(blog|tech)$/.test(category) && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slug);
}

function localDiscussionError(error: unknown, missingCode: string): Response {
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

  return Response.json({ error: code }, { status });
}

async function handleLocalDiscussionGet(
  request: Request,
  category: string,
  slug: string,
): Promise<Response> {
  if (!validDiscussionTarget(category, slug)) {
    return Response.json({ error: "invalid_target" }, { status: 400 });
  }

  const token = parseCookies(request.headers.get("cookie"))["gh_session"];
  try {
    const discussion = await getDiscussion(localDiscussionConfig(), category, slug, token);
    return Response.json({ discussion });
  } catch (error) {
    console.error("Discussion fetch error:", error);
    return localDiscussionError(error, "discussions_unavailable");
  }
}

async function handleLocalDiscussionComment(
  request: Request,
  category: string,
  slug: string,
): Promise<Response> {
  if (!validDiscussionTarget(category, slug)) {
    return Response.json({ error: "invalid_target" }, { status: 400 });
  }

  const token = parseCookies(request.headers.get("cookie"))["gh_session"];
  if (!token) return Response.json({ error: "auth_required" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }
  const body =
    typeof payload === "object" && payload !== null && "body" in payload
      ? (payload as { body?: unknown }).body
      : undefined;
  const text = typeof body === "string" ? body.trim() : "";
  if (!text || text.length > 5000) {
    return Response.json({ error: "invalid_comment" }, { status: 400 });
  }

  try {
    const result = await addDiscussionComment(
      localDiscussionConfig(),
      category,
      slug,
      text,
      token,
    );
    return Response.json(result, { status: 201 });
  } catch (error) {
    console.error("Discussion comment error:", error);
    return localDiscussionError(error, "discussion_not_found");
  }
}

async function handleLocalDiscussionReaction(
  request: Request,
  category: string,
  slug: string,
  commentId: string,
): Promise<Response> {
  if (!validDiscussionTarget(category, slug)) {
    return Response.json({ error: "invalid_target" }, { status: 400 });
  }

  const token = parseCookies(request.headers.get("cookie"))["gh_session"];
  if (!token) return Response.json({ error: "auth_required" }, { status: 401 });

  const numericId = Number(commentId);
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }
  const liked =
    typeof payload === "object" && payload !== null && "liked" in payload
      ? (payload as { liked?: unknown }).liked
      : undefined;
  if (!Number.isSafeInteger(numericId) || numericId <= 0 || typeof liked !== "boolean") {
    return Response.json({ error: "invalid_reaction" }, { status: 400 });
  }

  try {
    const result = await setDiscussionCommentLike(
      localDiscussionConfig(),
      category,
      slug,
      numericId,
      liked,
      token,
    );
    return Response.json(result);
  } catch (error) {
    console.error("Discussion reaction error:", error);
    return localDiscussionError(error, "discussion_not_found");
  }
}

const GH_CLIENT_ID = process.env.GH_CLIENT_ID || "";
const SITE_URL = "http://localhost:3000/";
const LOCAL_CALLBACK_URL = "http://localhost:3000/api/auth/callback";

function localRedirectResponse(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: location });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

const server = serve({
  routes: {
    "/favicon.ico": {
      GET() {
        return new Response(Bun.file(new URL("./favicon.ico", import.meta.url)), {
          headers: { "Content-Type": "image/x-icon", "Cache-Control": "public, max-age=86400" },
        });
      },
    },

    "/api/auth/login": {
      async GET(req) {
        const state = generateState();
        const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
        authorizeUrl.searchParams.set("client_id", GH_CLIENT_ID);
        authorizeUrl.searchParams.set("scope", "read:user write:discussion");
        authorizeUrl.searchParams.set("state", state);
        authorizeUrl.searchParams.set("redirect_uri", LOCAL_CALLBACK_URL);

        return localRedirectResponse(authorizeUrl.toString(), [
          setCookie("gh_oauth_state", state, 600, ["HttpOnly"]),
        ]);
      },
    },

    "/api/auth/callback": {
      async GET(req) {
        const url = new URL(req.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        if (!code || !state) {
          return new Response("Missing code or state", { status: 400 });
        }

        const cookies = parseCookies(req.headers.get("cookie"));
        const savedState = cookies["gh_oauth_state"];

        if (!savedState || savedState !== state) {
          return new Response("Invalid state", { status: 403 });
        }

        try {
          const tokenRes = await exchangeCodeForToken(code, LOCAL_CALLBACK_URL);
          if (!tokenRes.access_token) {
            return new Response("Failed to get access token", { status: 401 });
          }

          return localRedirectResponse(SITE_URL, [
            setCookie("gh_session", tokenRes.access_token, 60 * 60 * 24 * 30, ["HttpOnly"]),
            setCookie("gh_oauth_state", "", 0),
          ]);
        } catch (err) {
          console.error("OAuth callback error:", err);
          return new Response("Authentication failed", { status: 500 });
        }
      },
    },

    "/api/auth/user": {
      async GET(req) {
        const cookies = parseCookies(req.headers.get("cookie"));
        const token = cookies["gh_session"];

        if (!token) {
          return Response.json({ user: null }, { status: 401 });
        }

        try {
          const user = await fetchGitHubUser(token);
          return Response.json({ user });
        } catch {
          return Response.json({ user: null }, { status: 401 });
        }
      },
    },

    "/api/auth/logout": {
      async GET() {
        return localRedirectResponse(SITE_URL, [setCookie("gh_session", "", 0)]);
      },
    },

    "/api/discussions/:category/:slug": {
      async GET(req) {
        return handleLocalDiscussionGet(req, req.params.category, req.params.slug);
      },
    },

    "/api/discussions/:category/:slug/comments": {
      async POST(req) {
        return handleLocalDiscussionComment(req, req.params.category, req.params.slug);
      },
    },

    "/api/discussions/:category/:slug/comments/:commentId/reaction": {
      async POST(req) {
        return handleLocalDiscussionReaction(
          req,
          req.params.category,
          req.params.slug,
          req.params.commentId,
        );
      },
    },

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },

    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
