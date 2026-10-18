export interface Env {
	DB: D1Database;
	GH_CLIENT_ID: string;
	GH_CLIENT_SECRET: string;
	SITE_URL: string;
	ALLOWED_ORIGINS: string;
	ADMIN_GITHUB_LOGINS: string;
	GH_CALLBACK_URL?: string;
}

export interface GitHubProfile {
	id: number;
	login: string;
	avatar_url: string;
	name: string | null;
	html_url: string;
}

/** The shape the frontend expects from src/lib/auth.ts. */
export interface PublicUser {
	id: string;
	login: string;
	avatar_url: string;
	name: string | null;
	html_url: string;
	is_admin: boolean;
}

export interface UserRow {
	id: number;
	github_id: number;
	login: string;
	avatar_url: string;
	name: string | null;
	html_url: string;
	is_admin: number;
}

export function toPublicUser(row: UserRow): PublicUser {
	return {
		id: String(row.github_id),
		login: row.login,
		avatar_url: row.avatar_url,
		name: row.name,
		html_url: row.html_url,
		is_admin: Boolean(row.is_admin),
	};
}
