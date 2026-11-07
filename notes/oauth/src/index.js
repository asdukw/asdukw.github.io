/**
 * Decap CMS 的 GitHub OAuth 代理（Cloudflare Worker）。
 *
 * Decap 的 github 后端需要一个服务端完成 OAuth 握手，本 worker 提供：
 *   GET /auth?provider=github      -> 302 跳转到 GitHub 授权页
 *   GET /callback?provider=github  -> 用 code 换 token，并回传给打开它的 Decap 窗口
 *
 * 只允许 env.ADMIN_LOGIN 指定的 GitHub 账号（默认 asdukw）登录；
 * 其他账号即使拿到 token 也没有该仓库的写权限，这里再显式挡一层。
 *
 * 需要的 secret（用 wrangler secret put 设置）：
 *   GITHUB_OAUTH_ID        —— GitHub OAuth App 的 Client ID
 *   GITHUB_OAUTH_SECRET    —— GitHub OAuth App 的 Client Secret
 * 普通变量：
 *   ADMIN_LOGIN            —— 允许编辑的 GitHub 用户名（写在 wrangler.toml [vars]）
 */

function randomHex(bytes) {
	const buf = new Uint8Array(bytes);
	crypto.getRandomValues(buf);
	return Array.from(buf)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function callbackUri(url) {
	// 必须与 GitHub OAuth App 里登记的 Authorization callback URL 完全一致。
	return `${url.origin}/callback?provider=github`;
}

function handleAuth(url, env) {
	if (url.searchParams.get("provider") !== "github") {
		return new Response("Invalid provider", { status: 400 });
	}
	const authorize = new URL("https://github.com/login/oauth/authorize");
	authorize.searchParams.set("response_type", "code");
	authorize.searchParams.set("client_id", env.GITHUB_OAUTH_ID);
	authorize.searchParams.set("redirect_uri", callbackUri(url));
	// 仓库是公开的，public_repo 足以提交；user 用于读取登录用户资料。
	authorize.searchParams.set("scope", "public_repo,user");
	authorize.searchParams.set("state", randomHex(8));
	return new Response(null, { status: 302, headers: { Location: authorize.toString() } });
}

function callbackHtml(status, token) {
	const payload =
		status === "success"
			? JSON.stringify({ token, provider: "github" })
			: JSON.stringify({ message: "登录失败" });
	return new Response(
		`<!doctype html><html><head><meta charset="utf-8"><title>授权中…</title></head><body>
<p>正在授权 Decap…</p>
<script>
(function () {
  var message = 'authorization:github:${status}:${payload.replace(/'/g, "\\'")}';
  function receive(e) {
    window.opener && window.opener.postMessage(message, e.origin || '*');
    window.removeEventListener('message', receive, false);
  }
  window.addEventListener('message', receive, false);
  window.opener && window.opener.postMessage('authorizing:github', '*');
})();
</script></body></html>`,
		{ headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
	);
}

async function handleCallback(url, env) {
	if (url.searchParams.get("provider") !== "github") {
		return new Response("Invalid provider", { status: 400 });
	}
	const code = url.searchParams.get("code");
	if (!code) return new Response("Missing code", { status: 400 });

	const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: { Accept: "application/json", "Content-Type": "application/json" },
		body: JSON.stringify({
			client_id: env.GITHUB_OAUTH_ID,
			client_secret: env.GITHUB_OAUTH_SECRET,
			code,
			redirect_uri: callbackUri(url),
			grant_type: "authorization_code",
		}),
	});
	const tokenJson = await tokenRes.json();
	const token = tokenJson.access_token;
	if (!token) return callbackHtml("error", "");

	// 限制为指定账号。
	const allowed = (env.ADMIN_LOGIN || "").trim().toLowerCase();
	if (allowed) {
		const userRes = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/vnd.github+json",
				"User-Agent": "notes-decap-oauth",
			},
		});
		const user = await userRes.json();
		if (!user || String(user.login || "").toLowerCase() !== allowed) {
			return callbackHtml("error", "");
		}
	}

	return callbackHtml("success", token);
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		try {
			if (url.pathname === "/auth") return handleAuth(url, env);
			if (url.pathname === "/callback") return handleCallback(url, env);
			if (url.pathname === "/") {
				return new Response("notes-decap-oauth: ok\n", { status: 200 });
			}
			return new Response("Not found", { status: 404 });
		} catch (err) {
			return new Response(`OAuth error: ${err && err.message ? err.message : err}`, {
				status: 500,
			});
		}
	},
};
