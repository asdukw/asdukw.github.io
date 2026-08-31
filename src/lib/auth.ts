export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  name: string | null;
  html_url: string;
}

declare const process: { env: Record<string, string | undefined> };

export function getAuthApiBase(): string {
  return process.env.BUN_PUBLIC_AUTH_API_URL?.replace(/\/$/, "") ?? "";
}

export function getAdminUserId(): number | null {
  const raw = process.env.BUN_PUBLIC_ADMIN_USER_ID;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function fetchCurrentUser(): Promise<GitHubUser | null> {
  const base = getAuthApiBase();
  try {
    const res = await fetch(`${base}/api/auth/user`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: GitHubUser | null };
    return data.user;
  } catch {
    return null;
  }
}
