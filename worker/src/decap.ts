import type { Env } from "./env";

/**
 * Decap CMS 的 GitHub OAuth 端（复用主站同一个 OAuth App 与 GH_CLIENT_ID/SECRET）。
 *
 *   GET /decap/auth?provider=github      -> 302 跳转 GitHub 授权页
 *   GET /decap/callback?code=...         -> 换 token 并回传给打开它的 Decap 弹窗
 *
 * Decap 的 `backend.base_url` 配成 `https://<本 worker 域名>/decap`，
 * 它会请求 `{base_url}/auth`，本文件用 `/decap/callback` 作为 redirect_uri。
 * 需要在 GitHub OAuth App 里把这个 `/decap/callback` 加为 redirect URI。
 */

const GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN = "https://github.com/login/oauth/access_token";
const GITHUB_USER = "https://api.github.com/user";
// 公开仓库提交只需 public_repo；若仓库转私有，改成 "repo,user"。
const SCOPE = "public_repo,user";

function randomHex(bytes: number): string {
	const buf = new Uint8Array(bytes);
	crypto.getRandomValues(buf);
	return Array.from(buf)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function callbackUri(request: Request): string {
	const url = new URL(request.url);
	return `${url.origin}/decap/callback`;
}

function html(body: string, status = 200): Response {
	return new Response(body, {
		status,
		headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
	});
}

/** 回传 token 给 Decap 弹窗；消息格式遵循 Decap/Netlify 的 OAuth 协议。 */
function popupHtml(status: "success" | "error", payload: unknown): Response {
	const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
	const escaped = message.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
	return html(`<!doctype html><html><head><meta charset="utf-8"><title>授权中…</title></head><body>
<p>正在授权 Decap…</p>
<script>
(function () {
  var message = '${escaped}';
  function receive(e) {
    if (window.opener) window.opener.postMessage(message, e.origin || '*');
    window.removeEventListener('message', receive, false);
  }
  window.addEventListener('message', receive, false);
  if (window.opener) window.opener.postMessage('authorizing:github', '*');
})();
</script></body></html>`);
}

export async function handleDecapAuth(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	if (url.searchParams.get("provider") !== "github") {
		return new Response("Invalid provider", { status: 400 });
	}
	const authorize = new URL(GITHUB_AUTHORIZE);
	authorize.searchParams.set("response_type", "code");
	authorize.searchParams.set("client_id", env.GH_CLIENT_ID);
	authorize.searchParams.set("redirect_uri", callbackUri(request));
	authorize.searchParams.set("scope", SCOPE);
	authorize.searchParams.set("state", randomHex(8));
	return Response.redirect(authorize.toString(), 302);
}

export async function handleDecapCallback(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	if (!code) return html("Missing code", 400);

	const tokenRes = await fetch(GITHUB_TOKEN, {
		method: "POST",
		headers: { Accept: "application/json", "Content-Type": "application/json" },
		body: JSON.stringify({
			client_id: env.GH_CLIENT_ID,
			client_secret: env.GH_CLIENT_SECRET,
			code,
			redirect_uri: callbackUri(request),
			grant_type: "authorization_code",
		}),
	});
	const tokenJson = (await tokenRes.json()) as { access_token?: string };
	const token = tokenJson.access_token;
	if (!token) return popupHtml("error", { message: "token exchange failed" });

	// 仅允许 ADMIN_GITHUB_LOGINS 里的账号（与评论登录共用同一白名单）。
	const allowed = (env.ADMIN_GITHUB_LOGINS ?? "")
		.split(",")
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);
	if (allowed.length > 0) {
		const userRes = await fetch(GITHUB_USER, {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/vnd.github+json",
				"User-Agent": "asdukw-api",
			},
		});
		const user = (await userRes.json()) as { login?: string };
		if (!user || !allowed.includes(String(user.login ?? "").toLowerCase())) {
			return popupHtml("error", { message: "not allowed" });
		}
	}

	return popupHtml("success", { token, provider: "github" });
}
