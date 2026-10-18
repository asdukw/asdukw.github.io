import { API_BASE, ApiError, apiJson, readToken, writeToken } from "@/lib/api";

export interface GitHubUser {
	id: string;
	login: string;
	avatar_url: string;
	name: string | null;
	html_url: string;
	is_admin: boolean;
}

/**
 * The OAuth callback returns to the site with `#token=...`, which keeps the token
 * out of server logs and the Referer header. Move it into storage and clean the URL.
 */
export function consumeSessionToken(): boolean {
	const match = /(?:^|[#&])token=([^&]+)/.exec(window.location.hash);
	const token = match?.[1];
	if (!token) return false;

	writeToken(decodeURIComponent(token));
	window.history.replaceState(
		null,
		"",
		`${window.location.pathname}${window.location.search}`,
	);
	return true;
}

export function signInWithGitHub(): void {
	if (!API_BASE) {
		console.error("Cannot sign in: BUN_PUBLIC_API_BASE is not configured");
		return;
	}
	const redirect = `${window.location.origin}${window.location.pathname}${window.location.search}`;
	window.location.href = `${API_BASE}/api/auth/login?redirect=${encodeURIComponent(redirect)}`;
}

export async function fetchCurrentUser(): Promise<GitHubUser | null> {
	if (!readToken()) return null;

	try {
		const { user } = await apiJson<{ user: GitHubUser | null }>("/api/auth/user");
		if (!user) writeToken(null);
		return user;
	} catch (error) {
		// A rejected token is worth discarding; an unreachable API is not.
		if (error instanceof ApiError && error.status === 401) writeToken(null);
		return null;
	}
}

export async function signOut(): Promise<void> {
	try {
		await apiJson("/api/auth/logout", { method: "POST" });
	} finally {
		writeToken(null);
	}
}
