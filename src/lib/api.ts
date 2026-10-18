declare const process: { env: Record<string, string | undefined> };

const TOKEN_KEY = "site.session";

function resolveApiBase(): string {
	const configured = process.env.BUN_PUBLIC_API_BASE?.trim();
	if (configured) return configured.replace(/\/+$/, "");
	// `bun dev` talks to `bun x wrangler dev` in worker/ without extra configuration.
	if (process.env.NODE_ENV !== "production") return "http://localhost:8787";
	// Articles are static, so a missing API base must not take the whole site down:
	// only the comment section reports itself as unavailable.
	return "";
}

export const API_BASE = resolveApiBase();

export class ApiError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
	) {
		super(code);
		this.name = "ApiError";
	}
}

/**
 * The session token lives in localStorage rather than a cookie: the API is served
 * from workers.dev while the site runs on pages.dev, and cross-site cookies are
 * blocked by default in several browsers.
 */
export function readToken(): string | null {
	try {
		return window.localStorage.getItem(TOKEN_KEY);
	} catch {
		return null;
	}
}

export function writeToken(token: string | null): void {
	try {
		if (token) window.localStorage.setItem(TOKEN_KEY, token);
		else window.localStorage.removeItem(TOKEN_KEY);
	} catch {
		// Private mode or blocked storage: the session simply does not persist.
	}
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
	if (!API_BASE) throw new ApiError(503, "api_not_configured");

	const headers = new Headers(init.headers);
	const token = readToken();
	if (token) headers.set("Authorization", `Bearer ${token}`);
	if (init.body) headers.set("Content-Type", "application/json");

	let response: Response;
	try {
		response = await fetch(`${API_BASE}${path}`, { ...init, headers });
	} catch {
		throw new ApiError(503, "api_unavailable");
	}

	const payload: unknown = await response.json().catch(() => null);

	if (!response.ok) {
		const code =
			payload && typeof payload === "object" && "error" in payload
				? String((payload as { error: unknown }).error)
				: "request_failed";
		throw new ApiError(response.status, code);
	}

	return payload as T;
}
