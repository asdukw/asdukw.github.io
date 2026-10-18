import type { Env } from "./env";

function normalizeOrigin(value: string): string {
	return value.trim().replace(/\/+$/, "");
}

export function allowedOrigins(env: Env): string[] {
	return `${env.ALLOWED_ORIGINS ?? ""},${env.SITE_URL ?? ""}`
		.split(",")
		.map(normalizeOrigin)
		.filter(Boolean);
}

/**
 * Returns the request Origin when it is one of the configured sites, so a page on
 * another domain cannot read responses with a stolen token.
 */
export function resolveOrigin(request: Request, env: Env): string | null {
	const origin = request.headers.get("Origin");
	if (!origin) return null;
	const normalized = normalizeOrigin(origin);
	return allowedOrigins(env).includes(normalized) ? normalized : null;
}

export function corsHeaders(request: Request, env: Env): Record<string, string> {
	const headers: Record<string, string> = {
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
		"Access-Control-Max-Age": "86400",
		Vary: "Origin",
	};
	const origin = resolveOrigin(request, env);
	if (origin) headers["Access-Control-Allow-Origin"] = origin;
	return headers;
}

export function json(
	data: unknown,
	status = 200,
	headers: Record<string, string> = {},
): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store",
			...headers,
		},
	});
}

export function apiError(
	status: number,
	code: string,
	headers: Record<string, string> = {},
): Response {
	return json({ error: code }, status, headers);
}

export function parseCookies(header: string | null): Record<string, string> {
	const cookies: Record<string, string> = {};
	if (!header) return cookies;
	for (const pair of header.split(";")) {
		const index = pair.indexOf("=");
		if (index === -1) continue;
		const key = pair.slice(0, index).trim();
		if (!key) continue;
		try {
			cookies[key] = decodeURIComponent(pair.slice(index + 1).trim());
		} catch {
			cookies[key] = pair.slice(index + 1).trim();
		}
	}
	return cookies;
}

export interface CookieOptions {
	maxAge: number;
	httpOnly?: boolean;
	secure?: boolean;
	sameSite?: "Lax" | "Strict" | "None";
}

export function serializeCookie(
	name: string,
	value: string,
	options: CookieOptions,
): string {
	const parts = [
		`${name}=${encodeURIComponent(value)}`,
		"Path=/",
		`Max-Age=${options.maxAge}`,
	];
	if (options.maxAge === 0) parts.push("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
	if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
	if (options.httpOnly) parts.push("HttpOnly");
	if (options.secure) parts.push("Secure");
	return parts.join("; ");
}

export function redirectResponse(location: string, cookies: string[] = []): Response {
	const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
	for (const cookie of cookies) headers.append("Set-Cookie", cookie);
	return new Response(null, { status: 302, headers });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
	try {
		const parsed = await request.json();
		return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}
