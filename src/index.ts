import { serve } from "bun";
import index from "./index.html";

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

async function exchangeCodeForToken(code: string): Promise<{ access_token: string }> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GH_CLIENT_ID,
      client_secret: process.env.GH_CLIENT_SECRET,
      code,
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

const GH_CLIENT_ID = process.env.GH_CLIENT_ID || "";
const SITE_URL = "http://localhost:3000/";

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
        const callbackUrl = `http://localhost:3000/api/auth/callback`;
        const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
        authorizeUrl.searchParams.set("client_id", GH_CLIENT_ID);
        authorizeUrl.searchParams.set("scope", "read:user");
        authorizeUrl.searchParams.set("state", state);
        authorizeUrl.searchParams.set("redirect_uri", callbackUrl);

        return new Response(null, {
          status: 302,
          headers: {
            Location: authorizeUrl.toString(),
            "Set-Cookie": setCookie("gh_oauth_state", state, 600, ["HttpOnly"]),
          },
        });
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
          const tokenRes = await exchangeCodeForToken(code);
          if (!tokenRes.access_token) {
            return new Response("Failed to get access token", { status: 401 });
          }

          return new Response(null, {
            status: 302,
            headers: {
              Location: SITE_URL,
              "Set-Cookie": [
                setCookie("gh_session", tokenRes.access_token, 60 * 60 * 24 * 30, ["HttpOnly"]),
                setCookie("gh_oauth_state", "", 0),
              ].join(", "),
            },
          });
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
        return new Response(null, {
          status: 302,
          headers: {
            Location: SITE_URL,
            "Set-Cookie": setCookie("gh_session", "", 0),
          },
        });
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
