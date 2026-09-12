import type { Category } from "@/lib/posts";
import { supabase } from "@/lib/supabase";

export interface CommentAuthor {
	id: string;
	login: string;
	avatarUrl: string;
	name: string | null;
	htmlUrl: string;
}

export interface ArticleComment {
	id: number;
	body: string;
	createdAt: string;
	updatedAt: string;
	parentId: number | null;
	author: CommentAuthor | null;
	reactions: {
		thumbsUp: number;
		viewerHasReacted: boolean;
	};
}

export class CommentsApiError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
	) {
		super(code);
		this.name = "CommentsApiError";
	}
}

interface CommentRow {
	id: number;
	body: string;
	created_at: string;
	updated_at: string;
	parent_id: number | null;
	author_id: string | null;
	author_login: string | null;
	author_avatar_url: string | null;
	author_name: string | null;
	author_html_url: string | null;
	thumbs_up: number | string;
	viewer_has_reacted: boolean;
}

interface ReactionRow {
	comment_id: number;
	liked: boolean;
	thumbs_up: number | string;
}

function rpcError(error: { code?: string; message: string }): CommentsApiError {
	return new CommentsApiError(
		400,
		error.code || error.message || "request_failed",
	);
}

function mapComment(row: CommentRow): ArticleComment {
	return {
		id: Number(row.id),
		body: row.body,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		parentId: row.parent_id === null ? null : Number(row.parent_id),
		author:
			row.author_id && row.author_login
				? {
						id: String(row.author_id),
						login: row.author_login,
						avatarUrl: row.author_avatar_url ?? "",
						name: row.author_name,
						htmlUrl:
							row.author_html_url ?? `https://github.com/${row.author_login}`,
					}
				: null,
		reactions: {
			thumbsUp: Number(row.thumbs_up),
			viewerHasReacted: Boolean(row.viewer_has_reacted),
		},
	};
}

export async function fetchComments(
	category: Category,
	slug: string,
): Promise<ArticleComment[]> {
	const { data, error } = await supabase.rpc("get_comments", {
		p_category: category,
		p_slug: slug,
	});
	if (error) throw rpcError(error);
	return ((data ?? []) as CommentRow[]).map(mapComment);
}

export async function addComment(
	category: Category,
	slug: string,
	body: string,
): Promise<{ comment: ArticleComment }> {
	const { data, error } = await supabase.rpc("add_comment", {
		p_category: category,
		p_slug: slug,
		p_body: body.trim(),
		p_parent_id: null,
	});
	if (error) throw rpcError(error);

	const commentId = Number(data);
	const comments = await fetchComments(category, slug);
	const comment = comments.find((item) => item.id === commentId);
	if (!comment)
		throw new CommentsApiError(500, "comment_not_found_after_insert");
	return { comment };
}

export async function setCommentLike(
	_category: Category,
	_slug: string,
	commentId: number,
	liked: boolean,
): Promise<{ commentId: number; liked: boolean; thumbsUp: number }> {
	const { data, error } = await supabase.rpc("set_comment_reaction", {
		p_comment_id: commentId,
		p_liked: liked,
	});
	if (error) throw rpcError(error);

	const row = (Array.isArray(data) ? data[0] : data) as ReactionRow | undefined;
	if (!row) throw new CommentsApiError(500, "reaction_not_found_after_update");
	return {
		commentId: Number(row.comment_id),
		liked: Boolean(row.liked),
		thumbsUp: Number(row.thumbs_up),
	};
}
