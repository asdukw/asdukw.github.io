import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface GitHubUser {
	id: string;
	login: string;
	avatar_url: string;
	name: string | null;
	html_url: string;
	is_admin: boolean;
}

interface UserProfile {
	id: number;
	login: string;
	avatar_url: string;
	name: string | null;
	html_url: string;
	is_admin: boolean;
}

function metadataString(user: SupabaseUser, key: string): string | null {
	const value = user.user_metadata?.[key];
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function fallbackUser(user: SupabaseUser): GitHubUser {
	const login =
		metadataString(user, "user_name") ??
		metadataString(user, "preferred_username") ??
		metadataString(user, "name") ??
		user.email?.split("@", 1)[0] ??
		"GitHub user";
	const avatarUrl = metadataString(user, "avatar_url") ?? "";

	return {
		id: user.id,
		login,
		avatar_url: avatarUrl,
		name: metadataString(user, "full_name") ?? metadataString(user, "name"),
		html_url: metadataString(user, "html_url") ?? `https://github.com/${login}`,
		is_admin: false,
	};
}

export async function userFromSupabaseUser(
	user: SupabaseUser,
): Promise<GitHubUser> {
	await supabase.rpc("ensure_profile");

	const { data: profile } = await supabase
		.from("users")
		.select("id, login, avatar_url, name, html_url, is_admin")
		.eq("auth_user_id", user.id)
		.maybeSingle<UserProfile>();

	if (!profile) return fallbackUser(user);

	return {
		id: user.id,
		login: profile.login,
		avatar_url: profile.avatar_url,
		name: profile.name,
		html_url: profile.html_url,
		is_admin: profile.is_admin,
	};
}

export async function fetchCurrentUser(): Promise<GitHubUser | null> {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	return session?.user ? userFromSupabaseUser(session.user) : null;
}

export async function signInWithGitHub(): Promise<void> {
	const { error } = await supabase.auth.signInWithOAuth({
		provider: "github",
		options: {
			redirectTo: window.location.origin,
		},
	});
	if (error) throw error;
}

export async function signOut(): Promise<void> {
	const { error } = await supabase.auth.signOut();
	if (error) throw error;
}
