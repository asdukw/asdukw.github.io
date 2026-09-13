import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, ArrowRight, Clock, Pencil } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PostContent } from "@/components/blog/PostContent";
import { TOC } from "@/components/blog/TOC";
import { CommentsSection } from "@/components/blog/CommentsSection";
import { useLang } from "@/i18n/LanguageContext";
import { useAllPosts, type Post } from "@/lib/posts";
import { formatDate } from "@/lib/format";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/lib/AuthContext";

function PrevNext({
	post,
	posts,
}: {
	post: Post;
	posts: Post[];
}) {
	const index = posts.findIndex((p) => p.key === post.key);
	const prev = posts[index - 1];
	const next = posts[index + 1];

	return (
		<div className="mt-10 grid gap-3 sm:grid-cols-2">
			{prev ? (
				<Link
					to={`/post/${prev.id}`}
					className="group rounded-lg border border-border/60 p-4 transition-colors hover:border-border"
				>
					<div className="flex items-center gap-1 text-xs text-muted-foreground">
						<ArrowLeft className="h-3 w-3" />
					</div>
					<div className="mt-1 line-clamp-1 text-sm font-medium group-hover:text-foreground">
						{prev.title}
					</div>
				</Link>
			) : (
				<div aria-hidden />
			)}
			{next ? (
				<Link
					to={`/post/${next.id}`}
					className="group rounded-lg border border-border/60 p-4 text-right transition-colors hover:border-border"
				>
					<div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
						<ArrowRight className="h-3 w-3" />
					</div>
					<div className="mt-1 line-clamp-1 text-sm font-medium group-hover:text-foreground">
						{next.title}
					</div>
				</Link>
			) : (
				<div aria-hidden />
			)}
		</div>
	);
}

export function PostDetailPage() {
	const { id } = useParams();
	const { lang, t, setLang } = useLang();
	const { user, isAdmin } = useAuth();
	const { posts: allPosts, loading, error, retry } = useAllPosts();
	const posts = useMemo(
		() =>
			allPosts
				.filter((item) => item.lang === lang)
				.sort(
					(a, b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key),
				),
		[allPosts, lang],
	);
	const postId = Number(id);
	const post = Number.isSafeInteger(postId) ? posts.find((item) => item.id === postId) : undefined;
	usePageTitle(post?.title);

	if (loading) {
		return (
			<p className="py-20 text-center text-sm text-muted-foreground">
				{t.list.loading}
			</p>
		);
	}

	if (error) {
		return (
			<div className="py-20 text-center text-sm text-muted-foreground">
				<p>{t.list.loadError}</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-6"
					onClick={retry}
				>
					{t.list.retry}
				</Button>
			</div>
		);
	}

	if (!post) {
		return (
			<div className="py-20 text-center">
				<p className="text-2xl font-semibold">404</p>
				<p className="mt-2 text-sm text-muted-foreground">{t.list.empty}</p>
				<Button asChild variant="outline" size="sm" className="mt-6">
					<Link to="/">{t.nav.home}</Link>
				</Button>
			</div>
		);
	}

	const translations = allPosts.filter(
		(item) => item.id === post.id,
	);
	const other = translations.find((p) => p.lang !== lang);
	const canEdit = Boolean(user && (isAdmin || post.authorAuthUserId === user.id));

	return (
		<div>
			<Link
				to="/post"
				className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowLeft className="h-4 w-4" />
				{t.post.backToCategory}
			</Link>

			<div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_220px]">
				<article className="min-w-0">
					<header>
						<div className="flex items-start justify-between gap-4">
							<h1 className="text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
								{post.title}
							</h1>
							{canEdit && (
								<Button asChild variant="outline" size="sm" className="shrink-0">
									<Link to={`/edit/${post.id}`}>
										<Pencil className="h-4 w-4" />
										{lang === "zh" ? "编辑" : "Edit"}
									</Link>
								</Button>
							)}
						</div>
						<div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
							<time dateTime={post.date}>
								{t.post.publishedOn} {formatDate(post.date, lang)}
							</time>
							<span aria-hidden>·</span>
							<span className="inline-flex items-center gap-1">
								<Clock className="h-3.5 w-3.5" />
								{post.readingTime} {t.common.minRead}
							</span>
						</div>
						{post.tags.length > 0 && (
							<div className="mt-3 flex flex-wrap gap-1.5">
								{post.tags.map((tag) => (
									<Badge key={tag} variant="secondary" className="font-normal">
										{tag}
									</Badge>
								))}
							</div>
						)}
					</header>

					<Separator className="my-6" />

					<PostContent html={post.html} />

					{other && (
						<div className="mt-10 rounded-lg border border-border/60 bg-muted/40 p-4 text-sm">
							<span className="text-muted-foreground">
								{t.post.translatedAs}
							</span>{" "}
							<button
								type="button"
								onClick={() => setLang(other.lang)}
								className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground"
							>
								{other.title}
							</button>
						</div>
					)}

					<Separator className="my-6" />
					<CommentsSection postId={post.id} />
					<Separator className="my-6" />
					<PrevNext post={post} posts={posts} />
				</article>

				<aside className="hidden lg:block">
					<TOC toc={post.toc} />
				</aside>
			</div>
		</div>
	);
}
