import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, MessageCircle, Reply, Send, ThumbsUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLang } from "@/i18n/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import {
	addComment,
	CommentsApiError,
	fetchComments,
	setCommentLike,
	type ArticleComment,
} from "@/lib/comments";

function formatCommentDate(iso: string, lang: "zh" | "en"): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
		dateStyle: "medium",
	}).format(date);
}

function authorName(comment: ArticleComment): string {
	return comment.author?.name || comment.author?.login || "GitHub user";
}

function avatarFallback(comment: ArticleComment): string {
	return (comment.author?.login || "GH").slice(0, 2).toUpperCase();
}

function isUnavailable(error: unknown): boolean {
	return (
		error instanceof CommentsApiError &&
		(error.code === "comments_unavailable" || error.status === 503)
	);
}

function CommentItem({
	comment,
	lang,
	isLoggedIn,
	likePending,
	onLike,
	onReply,
	likeLabel,
	likedLabel,
	signInLabel,
}: {
	comment: ArticleComment;
	lang: "zh" | "en";
	isLoggedIn: boolean;
	likePending: boolean;
	onLike: (comment: ArticleComment) => void;
	likeLabel: string;
	likedLabel: string;
	signInLabel: string;
	onReply: (comment: ArticleComment) => void;
}) {
	const liked = comment.reactions.viewerHasReacted;

	return (
		<article className="border-b border-border/60 py-5 first:pt-0 last:border-b-0">
			<div className="flex items-start gap-3">
				<Avatar size="sm">
					{comment.author?.avatarUrl && (
						<AvatarImage
							src={comment.author.avatarUrl}
							alt={authorName(comment)}
						/>
					)}
					<AvatarFallback>{avatarFallback(comment)}</AvatarFallback>
				</Avatar>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
						{comment.author?.htmlUrl ? (
							<a
								href={comment.author.htmlUrl}
								target="_blank"
								rel="noreferrer"
								className="text-sm font-medium hover:underline"
							>
								{authorName(comment)}
							</a>
						) : (
							<span className="text-sm font-medium">{authorName(comment)}</span>
						)}
						<time
							dateTime={comment.createdAt}
							className="text-xs text-muted-foreground"
						>
							{formatCommentDate(comment.createdAt, lang)}
						</time>
					</div>
					<p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
						{comment.body}
					</p>
					<div className="mt-3 flex items-center gap-1">
						<Button type="button" variant="ghost" size="xs" className="text-muted-foreground" onClick={() => onReply(comment)}>
							<Reply />
							<span>{lang === "zh" ? "回复" : "Reply"}</span>
						</Button>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant={liked ? "secondary" : "ghost"}
									size="xs"
									className={
										liked ? "text-foreground" : "text-muted-foreground"
									}
									disabled={likePending}
									onClick={() => onLike(comment)}
									aria-label={
										isLoggedIn ? (liked ? likedLabel : likeLabel) : signInLabel
									}
								>
									{likePending ? (
										<LoaderCircle className="animate-spin" />
									) : (
										<ThumbsUp className={liked ? "fill-current" : undefined} />
									)}
									<span>{comment.reactions.thumbsUp}</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								{isLoggedIn ? (liked ? likedLabel : likeLabel) : signInLabel}
							</TooltipContent>
						</Tooltip>
					</div>
				</div>
			</div>
		</article>
	);
}

export function CommentsSection({
	postId,
}: {
	postId: number;
}) {
	const { lang, t } = useLang();
	const { user, loading: authLoading, login } = useAuth();
	const [comments, setComments] = useState<ArticleComment[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<"load" | "unavailable" | null>(
		null,
	);
	const [actionError, setActionError] = useState<"generic" | null>(null);
	const [draft, setDraft] = useState("");
	const [replyTo, setReplyTo] = useState<ArticleComment | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [pendingLikes, setPendingLikes] = useState<Set<number>>(new Set());

	const loadComments = useCallback(async () => {
		setLoading(true);
		setLoadError(null);
		try {
			const loadedComments = await fetchComments(postId);
			setComments(loadedComments);
    } catch (error) {
			setLoadError(isUnavailable(error) ? "unavailable" : "load");
		} finally {
			setLoading(false);
		}
	}, [postId]);

	useEffect(() => {
		void loadComments();
	}, [loadComments, user?.id]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!user) {
			login();
			return;
		}

		const body = draft.trim();
		if (!body || submitting) return;

		setSubmitting(true);
		setActionError(null);
		try {
			const result = await addComment(postId, body, replyTo?.id ?? null);
			setComments((previous) => [...previous, result.comment]);
			setDraft("");
			setReplyTo(null);
    } catch {
			setActionError("generic");
		} finally {
			setSubmitting(false);
		}
	};

	const handleLike = async (comment: ArticleComment) => {
		if (!user) {
			login();
			return;
		}

		const liked = !comment.reactions.viewerHasReacted;
		setActionError(null);
		setPendingLikes((previous) => new Set(previous).add(comment.id));
		try {
			const result = await setCommentLike(postId, comment.id, liked);
			setComments((previous) =>
				previous.map((item) =>
					item.id === result.commentId
						? {
								...item,
								reactions: {
									thumbsUp: result.thumbsUp,
									viewerHasReacted: result.liked,
								},
							}
						: item,
				),
			);
		} catch {
			setActionError("generic");
		} finally {
			setPendingLikes((previous) => {
				const next = new Set(previous);
				next.delete(comment.id);
				return next;
			});
		}
	};

	const roots = comments.filter((comment) => comment.parentId === null);
	const childrenByParent = new Map<number, ArticleComment[]>();
	for (const comment of comments) {
		if (comment.parentId === null) continue;
		const children = childrenByParent.get(comment.parentId) ?? [];
		children.push(comment);
		childrenByParent.set(comment.parentId, children);
	}
	const renderComment = (comment: ArticleComment, depth = 0): React.ReactNode => (
		<div key={comment.id} className={depth > 0 ? "ml-5 border-l border-border/60 pl-4 sm:ml-8" : undefined}>
			<CommentItem comment={comment} lang={lang} isLoggedIn={Boolean(user)} likePending={pendingLikes.has(comment.id)} onLike={handleLike} onReply={setReplyTo} likeLabel={t.comments.like} likedLabel={t.comments.liked} signInLabel={t.comments.signInToLike} />
			{(childrenByParent.get(comment.id) ?? []).map((child) => renderComment(child, depth + 1))}
		</div>
	);

	return (
		<section className="mt-12" aria-labelledby="comments-title">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<MessageCircle className="h-5 w-5 text-muted-foreground" />
					<h2
						id="comments-title"
						className="text-lg font-semibold tracking-tight"
					>
						{t.comments.title}
					</h2>
					{!loading && (
						<span className="text-sm text-muted-foreground">
							{comments.length} {t.comments.count}
						</span>
					)}
				</div>
			</div>

			{loading ? (
				<div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
					<LoaderCircle className="h-4 w-4 animate-spin" />
					{t.comments.loading}
				</div>
			) : loadError === "unavailable" ? (
				<div className="py-8 text-sm text-muted-foreground">
					<p>{t.comments.unavailable}</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="mt-4"
						onClick={() => void loadComments()}
					>
						{t.comments.retry}
					</Button>
				</div>
			) : loadError === "load" ? (
				<div className="py-8 text-sm text-muted-foreground">
					<p>{t.comments.loadError}</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="mt-4"
						onClick={() => void loadComments()}
					>
						{t.comments.retry}
					</Button>
				</div>
			) : (
				<>
					{comments.length > 0 ? (
						<div className="mt-6">
							{roots.map((comment) => renderComment(comment))}
						</div>
					) : (
						<p className="py-8 text-sm text-muted-foreground">
							{t.comments.empty}
						</p>
					)}

					{authLoading ? (
						<div className="mt-6 h-24 animate-pulse rounded-md bg-muted/60" />
					) : user ? (
						<form onSubmit={handleSubmit} className="mt-6">
							{replyTo && <div className="mb-2 flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground"><span>{lang === "zh" ? `回复 ${authorName(replyTo)}` : `Replying to ${authorName(replyTo)}`}</span><button type="button" onClick={() => setReplyTo(null)} className="underline">{lang === "zh" ? "取消" : "Cancel"}</button></div>}
							<Textarea
								value={draft}
								onChange={(event) => setDraft(event.target.value)}
								placeholder={t.comments.placeholder}
								maxLength={5000}
								aria-label={t.comments.placeholder}
								disabled={submitting}
							/>
							<div className="mt-3 flex flex-wrap items-center justify-between gap-3">
								<span className="text-xs text-muted-foreground">
									{draft.length}/5000
								</span>
								<Button
									type="submit"
									size="sm"
									disabled={submitting || !draft.trim()}
								>
									{submitting ? (
										<LoaderCircle className="animate-spin" />
									) : (
										<Send />
									)}
									{submitting ? t.comments.submitting : t.comments.submit}
								</Button>
							</div>
						</form>
					) : (
						<div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/30 p-4">
							<p className="text-sm text-muted-foreground">
								{t.comments.signInToComment}
							</p>
							<Button type="button" variant="outline" size="sm" onClick={login}>
								{t.auth.signIn}
							</Button>
						</div>
					)}

					{actionError && (
						<div
							role="alert"
							className="mt-3 flex flex-wrap items-center gap-2 text-sm text-destructive"
						>
							<span>{t.comments.actionError}</span>
						</div>
					)}
				</>
			)}
		</section>
	);
}
