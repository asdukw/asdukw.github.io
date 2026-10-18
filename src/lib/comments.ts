import { ApiError, apiJson } from "@/lib/api";

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
	children?: ArticleComment[];
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

/** An unreachable Worker is a 503, which the UI shows as "temporarily unavailable". */
function toCommentsError(error: unknown): CommentsApiError {
	if (error instanceof ApiError) {
		return new CommentsApiError(error.status, error.code);
	}
	return new CommentsApiError(503, "comments_unavailable");
}

export async function fetchComments(postId: number): Promise<ArticleComment[]> {
	try {
		const { comments } = await apiJson<{ comments: ArticleComment[] }>(
			`/api/comments?post_id=${postId}`,
		);
		return comments;
	} catch (error) {
		throw toCommentsError(error);
	}
}

export async function addComment(
	postId: number,
	body: string,
	parentId: number | null = null,
): Promise<{ comment: ArticleComment }> {
	try {
		return await apiJson<{ comment: ArticleComment }>("/api/comments", {
			method: "POST",
			body: JSON.stringify({
				post_id: postId,
				body: body.trim(),
				parent_id: parentId,
			}),
		});
	} catch (error) {
		throw toCommentsError(error);
	}
}

export async function setCommentLike(
	_postId: number,
	commentId: number,
	liked: boolean,
): Promise<{ commentId: number; liked: boolean; thumbsUp: number }> {
	try {
		return await apiJson<{ commentId: number; liked: boolean; thumbsUp: number }>(
			`/api/comments/${commentId}/like`,
			{ method: "POST", body: JSON.stringify({ liked }) },
		);
	} catch (error) {
		throw toCommentsError(error);
	}
}
