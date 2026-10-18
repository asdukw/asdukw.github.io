import type { Env, UserRow } from "./env";
import { apiError, json, readJson } from "./http";
import { currentUser } from "./session";

const MAX_BODY = 5000;

interface CommentRow {
	id: number;
	body: string;
	created_at: string;
	updated_at: string;
	parent_id: number | null;
	github_id: number;
	login: string;
	avatar_url: string;
	name: string | null;
	html_url: string;
	thumbs_up: number;
	viewer_has_liked: number;
}

export interface PublicComment {
	id: number;
	body: string;
	createdAt: string;
	updatedAt: string;
	parentId: number | null;
	author: {
		id: string;
		login: string;
		avatarUrl: string;
		name: string | null;
		htmlUrl: string;
	};
	reactions: {
		thumbsUp: number;
		viewerHasReacted: boolean;
	};
}

// `?` order is positional: the viewer id feeds the like subquery in the select list,
// then the post id and the admin flag in the where clause.
const SELECT_COMMENTS = `select
		c.id, c.body, c.created_at, c.updated_at, c.parent_id,
		u.github_id, u.login, u.avatar_url, u.name, u.html_url,
		(select count(*) from comment_likes l where l.comment_id = c.id) as thumbs_up,
		(select count(*) from comment_likes l where l.comment_id = c.id and l.user_id = ?) as viewer_has_liked
	from comments c
	join users u on u.id = c.author_id`;

function toPublicComment(row: CommentRow): PublicComment {
	return {
		id: row.id,
		body: row.body,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		parentId: row.parent_id === null ? null : Number(row.parent_id),
		author: {
			id: String(row.github_id),
			login: row.login,
			avatarUrl: row.avatar_url,
			name: row.name,
			htmlUrl: row.html_url,
		},
		reactions: {
			thumbsUp: Number(row.thumbs_up),
			viewerHasReacted: Boolean(row.viewer_has_liked),
		},
	};
}

function viewerId(user: UserRow | null): number {
	return user?.id ?? 0;
}

async function selectComment(
	env: Env,
	commentId: number,
	user: UserRow | null,
): Promise<CommentRow | null> {
	return env.DB.prepare(`${SELECT_COMMENTS} where c.id = ?`)
		.bind(viewerId(user), commentId)
		.first<CommentRow>();
}

function parsePostId(value: unknown): number | null {
	const id = Number(value);
	return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function handleListComments(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const postId = parsePostId(url.searchParams.get("post_id"));
	if (postId === null) return apiError(400, "invalid_post_id");

	const user = await currentUser(request, env);
	const { results } = await env.DB.prepare(
		`${SELECT_COMMENTS}
		 where c.post_id = ? and (c.status = 'published' or ? = 1)
		 order by c.created_at, c.id`,
	)
		.bind(viewerId(user), postId, user?.is_admin ? 1 : 0)
		.all<CommentRow>();

	return json({ comments: (results ?? []).map(toPublicComment) });
}

export async function handleCreateComment(request: Request, env: Env): Promise<Response> {
	const user = await currentUser(request, env);
	if (!user) return apiError(401, "not_authenticated");

	const payload = await readJson(request);
	const postId = parsePostId(payload.post_id);
	if (postId === null) return apiError(400, "invalid_post_id");

	const body = typeof payload.body === "string" ? payload.body.trim() : "";
	if (!body || body.length > MAX_BODY) return apiError(400, "invalid_comment_body");

	let parentId: number | null = null;
	if (payload.parent_id !== undefined && payload.parent_id !== null) {
		parentId = parsePostId(payload.parent_id);
		if (parentId === null) return apiError(400, "invalid_parent");

		const parent = await env.DB.prepare(
			"select id from comments where id = ? and post_id = ? and status = 'published'",
		)
			.bind(parentId, postId)
			.first<{ id: number }>();
		if (!parent) return apiError(400, "invalid_parent");
	}

	const inserted = await env.DB.prepare(
		"insert into comments (post_id, author_id, parent_id, body) values (?, ?, ?, ?)",
	)
		.bind(postId, user.id, parentId, body)
		.run();

	const commentId = Number(inserted.meta.last_row_id);
	const row = await selectComment(env, commentId, user);
	if (!row) return apiError(500, "comment_not_found_after_insert");

	return json({ comment: toPublicComment(row) }, 201);
}

export async function handleSetLike(
	request: Request,
	env: Env,
	commentId: number,
): Promise<Response> {
	const user = await currentUser(request, env);
	if (!user) return apiError(401, "not_authenticated");

	const comment = await env.DB.prepare(
		"select id from comments where id = ? and status = 'published'",
	)
		.bind(commentId)
		.first<{ id: number }>();
	if (!comment) return apiError(404, "comment_not_found");

	const payload = await readJson(request);
	const liked = payload.liked === true;

	if (liked) {
		await env.DB.prepare(
			"insert or ignore into comment_likes (comment_id, user_id) values (?, ?)",
		)
			.bind(commentId, user.id)
			.run();
	} else {
		await env.DB.prepare(
			"delete from comment_likes where comment_id = ? and user_id = ?",
		)
			.bind(commentId, user.id)
			.run();
	}

	const row = await env.DB.prepare(
		"select count(*) as thumbs_up from comment_likes where comment_id = ?",
	)
		.bind(commentId)
		.first<{ thumbs_up: number }>();

	return json({
		commentId,
		liked,
		thumbsUp: Number(row?.thumbs_up ?? 0),
	});
}

export async function handleSetStatus(
	request: Request,
	env: Env,
	commentId: number,
): Promise<Response> {
	const user = await currentUser(request, env);
	if (!user) return apiError(401, "not_authenticated");
	if (!user.is_admin) return apiError(403, "not_authorized");

	const payload = await readJson(request);
	const status = payload.status;
	if (status !== "published" && status !== "hidden") {
		return apiError(400, "invalid_status");
	}

	const result = await env.DB.prepare(
		"update comments set status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') where id = ?",
	)
		.bind(status, commentId)
		.run();
	if (!result.meta.changes) return apiError(404, "comment_not_found");

	const row = await selectComment(env, commentId, user);
	if (!row) return apiError(404, "comment_not_found");
	return json({ comment: toPublicComment(row) });
}
