import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, MessageCircle, Send, ThumbsUp } from "lucide-react";
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
  addDiscussionComment,
  DiscussionApiError,
  fetchDiscussion,
  setDiscussionCommentLike,
  type DiscussionComment,
} from "@/lib/discussions";
import type { Category } from "@/lib/posts";

function formatCommentDate(iso: string, lang: "zh" | "en"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
  }).format(date);
}

function authorName(comment: DiscussionComment): string {
  return comment.author?.name || comment.author?.login || "GitHub user";
}

function avatarFallback(comment: DiscussionComment): string {
  return (comment.author?.login || "GH").slice(0, 2).toUpperCase();
}

function isUnavailable(error: unknown): boolean {
  return (
    error instanceof DiscussionApiError &&
    (error.code === "discussions_unavailable" || error.status === 503)
  );
}

function CommentItem({
  comment,
  lang,
  isLoggedIn,
  likePending,
  onLike,
  likeLabel,
  likedLabel,
  signInLabel,
}: {
  comment: DiscussionComment;
  lang: "zh" | "en";
  isLoggedIn: boolean;
  likePending: boolean;
  onLike: (comment: DiscussionComment) => void;
  likeLabel: string;
  likedLabel: string;
  signInLabel: string;
}) {
  const liked = comment.reactions.viewerHasReacted;

  return (
    <article className="border-b border-border/60 py-5 first:pt-0 last:border-b-0">
      <div className="flex items-start gap-3">
        <Avatar size="sm">
          {comment.author?.avatarUrl && (
            <AvatarImage src={comment.author.avatarUrl} alt={authorName(comment)} />
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={liked ? "secondary" : "ghost"}
                  size="xs"
                  className={liked ? "text-foreground" : "text-muted-foreground"}
                  disabled={likePending}
                  onClick={() => onLike(comment)}
                  aria-label={isLoggedIn ? (liked ? likedLabel : likeLabel) : signInLabel}
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
  category,
  slug,
}: {
  category: Category;
  slug: string;
}) {
  const { lang, t } = useLang();
  const { user, loading: authLoading, login } = useAuth();
  const [comments, setComments] = useState<DiscussionComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<"load" | "unavailable" | null>(null);
  const [actionError, setActionError] = useState<"generic" | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingLikes, setPendingLikes] = useState<Set<number>>(new Set());

  const loadComments = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const discussion = await fetchDiscussion(category, slug);
      setComments(discussion?.comments ?? []);
    } catch (error) {
      setLoadError(isUnavailable(error) ? "unavailable" : "load");
    } finally {
      setLoading(false);
    }
  }, [category, slug]);

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
      const result = await addDiscussionComment(category, slug, body);
      setComments((previous) => [...previous, result.comment]);
      setDraft("");
    } catch (error) {
      setActionError("generic");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (comment: DiscussionComment) => {
    if (!user) {
      login();
      return;
    }

    const liked = !comment.reactions.viewerHasReacted;
    setActionError(null);
    setPendingLikes((previous) => new Set(previous).add(comment.id));
    try {
      const result = await setDiscussionCommentLike(
        category,
        slug,
        comment.id,
        liked,
      );
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
    } catch (error) {
      setActionError("generic");
    } finally {
      setPendingLikes((previous) => {
        const next = new Set(previous);
        next.delete(comment.id);
        return next;
      });
    }
  };

  return (
    <section className="mt-12" aria-labelledby="comments-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
          <h2 id="comments-title" className="text-lg font-semibold tracking-tight">
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
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  lang={lang}
                  isLoggedIn={Boolean(user)}
                  likePending={pendingLikes.has(comment.id)}
                  onLike={handleLike}
                  likeLabel={t.comments.like}
                  likedLabel={t.comments.liked}
                  signInLabel={t.comments.signInToLike}
                />
              ))}
            </div>
          ) : (
            <p className="py-8 text-sm text-muted-foreground">{t.comments.empty}</p>
          )}

          {authLoading ? (
            <div className="mt-6 h-24 animate-pulse rounded-md bg-muted/60" />
          ) : user ? (
            <form onSubmit={handleSubmit} className="mt-6">
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
                <Button type="submit" size="sm" disabled={submitting || !draft.trim()}>
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
              <p className="text-sm text-muted-foreground">{t.comments.signInToComment}</p>
              <Button type="button" variant="outline" size="sm" onClick={login}>
                {t.auth.signIn}
              </Button>
            </div>
          )}

          {actionError && (
            <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 text-sm text-destructive">
              <span>{t.comments.actionError}</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
