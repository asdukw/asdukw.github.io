import type { Env, UserRow } from "./env";

const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

function toHex(bytes: Uint8Array): string {
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return toHex(bytes);
}

/** Only the hash is stored, so a leaked database dump cannot be replayed. */
async function hashToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(token),
	);
	return toHex(new Uint8Array(digest));
}

export function bearerToken(request: Request): string | null {
	const header = request.headers.get("Authorization");
	if (!header) return null;
	const match = /^Bearer\s+(.+)$/i.exec(header.trim());
	return match?.[1]?.trim() || null;
}

export async function createSession(env: Env, userId: number): Promise<string> {
	const token = randomToken();
	const expiresAt = new Date(Date.now() + SESSION_MS).toISOString();

	await env.DB.batch([
		env.DB.prepare("delete from sessions where expires_at <= ?").bind(
			new Date().toISOString(),
		),
		env.DB.prepare(
			"insert into sessions (token_hash, user_id, expires_at) values (?, ?, ?)",
		).bind(await hashToken(token), userId, expiresAt),
	]);

	return token;
}

/**
 * Resolves the caller from the Authorization header. The token is sent as a bearer
 * header rather than a cookie because the API lives on workers.dev while the site
 * lives on pages.dev: third-party cookies are unreliable across browsers.
 */
export async function currentUser(request: Request, env: Env): Promise<UserRow | null> {
	const token = bearerToken(request);
	if (!token) return null;

	const row = await env.DB.prepare(
		`select u.id, u.github_id, u.login, u.avatar_url, u.name, u.html_url, u.is_admin
		 from sessions s
		 join users u on u.id = s.user_id
		 where s.token_hash = ? and s.expires_at > ?`,
	)
		.bind(await hashToken(token), new Date().toISOString())
		.first<UserRow>();

	return row ?? null;
}

export async function destroySession(request: Request, env: Env): Promise<void> {
	const token = bearerToken(request);
	if (!token) return;
	await env.DB.prepare("delete from sessions where token_hash = ?")
		.bind(await hashToken(token))
		.run();
}
