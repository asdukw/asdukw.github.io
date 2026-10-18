import type { Env, GitHubProfile } from "./env";
import { toPublicUser } from "./env";
import {
	apiError,
	allowedOrigins,
	json,
	parseCookies,
	redirectResponse,
	serializeCookie,
} from "./http";
import { createSession, currentUser, destroySession } from "./session";

const STATE_COOKIE = "gh_oauth_state";
const STATE_MAX_AGE = 600;

function normalizeOrigin(value: string): string {
	return value.trim().replace(/\/+$/, "");
}

function callbackUrl(request: Request, env: Env): string {
	return env.GH_CALLBACK_URL || `${new URL(request.url).origin}/api/auth/callback`;
}

/** Keeps the post-login redirect on a configured site, so it cannot be an open redirect. */
function safeRedirect(value: string | null | undefined, env: Env): string {
	const fallback = `${normalizeOrigin(env.SITE_URL ?? "")}/`;
	if (!value) return fallback;
	try {
		const url = new URL(value);
		return allowedOrigins(env).includes(normalizeOrigin(url.origin))
			? url.toString()
			: fallback;
	} catch {
		return fallback;
	}
}

function adminLogins(env: Env): string[] {
	return (env.ADMIN_GITHUB_LOGINS ?? "")
		.split(",")
		.map((login) => login.trim().toLowerCase())
		.filter(Boolean);
}

async function exchangeCode(request: Request, env: Env, code: string): Promise<string> {
	const response = await fetch("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: { "Content-Type": "application/json", Accept: "application/json" },
		body: JSON.stringify({
			client_id: env.GH_CLIENT_ID,
			client_secret: env.GH_CLIENT_SECRET,
			code,
			redirect_uri: callbackUrl(request, env),
		}),
	});
	if (!response.ok) throw new Error(`token exchange failed: ${response.status}`);

	const payload = (await response.json()) as {
		access_token?: string;
		error?: string;
	};
	if (!payload.access_token) {
		throw new Error(payload.error || "no access token in response");
	}
	return payload.access_token;
}

async function fetchProfile(token: string): Promise<GitHubProfile> {
	const response = await fetch("https://api.github.com/user", {
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: "application/vnd.github+json",
			"User-Agent": "asdukw-api",
		},
	});
	if (!response.ok) throw new Error(`github api error: ${response.status}`);
	return (await response.json()) as GitHubProfile;
}

async function upsertUser(env: Env, profile: GitHubProfile): Promise<number> {
	const isAdmin = adminLogins(env).includes(profile.login.toLowerCase()) ? 1 : 0;

	await env.DB.prepare(
		`insert into users (github_id, login, avatar_url, name, html_url, is_admin)
		 values (?, ?, ?, ?, ?, ?)
		 on conflict(github_id) do update set
		   login = excluded.login,
		   avatar_url = excluded.avatar_url,
		   name = excluded.name,
		   html_url = excluded.html_url,
		   is_admin = excluded.is_admin,
		   updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
	)
		.bind(
			profile.id,
			profile.login,
			profile.avatar_url ?? "",
			profile.name ?? null,
			profile.html_url ?? "",
			isAdmin,
		)
		.run();

	const row = await env.DB.prepare("select id from users where github_id = ?")
		.bind(profile.id)
		.first<{ id: number }>();
	if (!row) throw new Error("user upsert returned no row");
	return row.id;
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const redirect = safeRedirect(url.searchParams.get("redirect"), env);

	const state = crypto.randomUUID();
	const authorize = new URL("https://github.com/login/oauth/authorize");
	authorize.searchParams.set("client_id", env.GH_CLIENT_ID);
	authorize.searchParams.set("scope", "read:user");
	authorize.searchParams.set("state", state);
	authorize.searchParams.set("redirect_uri", callbackUrl(request, env));

	const cookie = serializeCookie(
		STATE_COOKIE,
		JSON.stringify({ state, redirect }),
		{ maxAge: STATE_MAX_AGE, httpOnly: true, secure: true, sameSite: "Lax" },
	);

	return redirectResponse(authorize.toString(), [cookie]);
}

export async function handleCallback(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");

	const clearState = serializeCookie(STATE_COOKIE, "", {
		maxAge: 0,
		httpOnly: true,
		secure: true,
		sameSite: "Lax",
	});

	if (!code || !state) {
		return new Response("Missing code or state", {
			status: 400,
			headers: { "Set-Cookie": clearState },
		});
	}

	const saved = parseCookies(request.headers.get("Cookie"))[STATE_COOKIE];
	if (!saved) {
		return new Response("Invalid state", {
			status: 403,
			headers: { "Set-Cookie": clearState },
		});
	}

	let expected: { state?: string; redirect?: string };
	try {
		expected = JSON.parse(saved) as { state?: string; redirect?: string };
	} catch {
		return new Response("Invalid state", {
			status: 403,
			headers: { "Set-Cookie": clearState },
		});
	}

	if (!expected.state || expected.state !== state) {
		return new Response("Invalid state", {
			status: 403,
			headers: { "Set-Cookie": clearState },
		});
	}

	const accessToken = await exchangeCode(request, env, code);
	const profile = await fetchProfile(accessToken);
	const userId = await upsertUser(env, profile);
	const session = await createSession(env, userId);

	// The token travels in the fragment: it never reaches a server log or Referer.
	const target = new URL(safeRedirect(expected.redirect, env));
	target.hash = `token=${session}`;

	return redirectResponse(target.toString(), [clearState]);
}

export async function handleUser(request: Request, env: Env): Promise<Response> {
	const user = await currentUser(request, env);
	return json({ user: user ? toPublicUser(user) : null });
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
	await destroySession(request, env);
	return json({ ok: true });
}

export function methodNotAllowed(): Response {
	return apiError(405, "method_not_allowed");
}
