export interface Env {
  GH_CLIENT_ID: string;
  GH_CLIENT_SECRET: string;
  GH_CALLBACK_URL: string;
  SITE_URL: string;
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
    headers: { "Content-Type": "application/json", ...headers },
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

function setCookie(
  name: string,
  value: string,
  maxAge: number,
  extra: string[] = [],
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    ...extra,
  ];
  return parts.join("; ");
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
  const origin = new URL(request.url).origin;

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", env.GH_CLIENT_ID);
  authorizeUrl.searchParams.set("scope", "read:user");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("redirect_uri", env.GH_CALLBACK_URL);

  const cookie = setCookie("gh_oauth_state", state, 600, ["HttpOnly", "Secure"]);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      "Set-Cookie": cookie,
    },
  });
}

async function handleCallback(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const origin = request.headers.get("Origin");

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

    const sessionCookie = setCookie("gh_session", tokenRes.access_token, 60 * 60 * 24 * 30, [
      "HttpOnly",
      "Secure",
    ]);
    const clearStateCookie = setCookie("gh_oauth_state", "", 0);

    return new Response(null, {
      status: 302,
      headers: {
        Location: env.SITE_URL || "/",
        "Set-Cookie": [sessionCookie, clearStateCookie].join(", "),
      },
    });
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
  const clearSession = setCookie("gh_session", "", 0);

  return new Response(null, {
    status: 302,
    headers: {
      Location: env.SITE_URL || "/",
      "Set-Cookie": clearSession,
    },
  });
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

    return new Response("Not found", { status: 404 });
  },
};
