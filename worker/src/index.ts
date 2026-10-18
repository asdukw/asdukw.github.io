import type { Env } from "./env";
import {
	handleCallback,
	handleLogin,
	handleLogout,
	handleUser,
} from "./auth";
import {
	handleCreateComment,
	handleListComments,
	handleSetLike,
	handleSetStatus,
} from "./comments";
import { apiError, corsHeaders, json } from "./http";

const LIKE_PATH = /^\/api\/comments\/(\d+)\/like$/;
const STATUS_PATH = /^\/api\/comments\/(\d+)\/status$/;

async function route(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const method = request.method;

	if (url.pathname === "/api/health") {
		if (method !== "GET") return apiError(405, "method_not_allowed");
		return json({ ok: true });
	}

	if (url.pathname === "/api/auth/login") {
		return method === "GET" ? handleLogin(request, env) : apiError(405, "method_not_allowed");
	}
	if (url.pathname === "/api/auth/callback") {
		return method === "GET" ? handleCallback(request, env) : apiError(405, "method_not_allowed");
	}
	if (url.pathname === "/api/auth/user") {
		return method === "GET" ? handleUser(request, env) : apiError(405, "method_not_allowed");
	}
	if (url.pathname === "/api/auth/logout") {
		return method === "POST" ? handleLogout(request, env) : apiError(405, "method_not_allowed");
	}

	if (url.pathname === "/api/comments") {
		if (method === "GET") return handleListComments(request, env);
		if (method === "POST") return handleCreateComment(request, env);
		return apiError(405, "method_not_allowed");
	}

	const like = LIKE_PATH.exec(url.pathname);
	if (like?.[1]) {
		return method === "POST"
			? handleSetLike(request, env, Number(like[1]))
			: apiError(405, "method_not_allowed");
	}

	const status = STATUS_PATH.exec(url.pathname);
	if (status?.[1]) {
		return method === "POST"
			? handleSetStatus(request, env, Number(status[1]))
			: apiError(405, "method_not_allowed");
	}

	return apiError(404, "not_found");
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const cors = corsHeaders(request, env);

		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: cors });
		}

		try {
			const response = await route(request, env);
			// Redirects are top-level navigations: they need no CORS, and rebuilding
			// them would risk collapsing the multiple Set-Cookie headers of the OAuth flow.
			if (response.status === 302) return response;

			const headers = new Headers(response.headers);
			for (const [key, value] of Object.entries(cors)) headers.set(key, value);
			return new Response(response.body, { status: response.status, headers });
		} catch (error) {
			console.error("unhandled error", error);
			return apiError(500, "internal_error", cors);
		}
	},
};
