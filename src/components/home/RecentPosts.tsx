import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { POST_INFO, usePosts } from "@/lib/posts";
import { PostCard } from "@/components/blog/PostCard";

export function RecentPosts({
	limit = 3,
}: {
	limit?: number;
}) {
	const { lang, t } = useLang();
	const { posts, loading, error } = usePosts(lang, limit);

	return (
		<section className="mt-10">
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-lg font-semibold tracking-tight">
					{POST_INFO.name[lang]}
				</h2>
				<Link
					to="/post"
					className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					{t.home.viewAll}
					<ArrowRight className="h-4 w-4" />
				</Link>
			</div>

			{loading ? (
				<p className="text-sm text-muted-foreground">{t.list.loading}</p>
			) : error ? (
				<p className="text-sm text-muted-foreground">{t.list.loadError}</p>
			) : posts.length ? (
				<div className="grid gap-4 sm:grid-cols-2">
					{posts.map((post) => (
						<PostCard key={post.key} post={post} />
					))}
				</div>
			) : (
				<p className="text-sm text-muted-foreground">
					{POST_INFO.description[lang]}
				</p>
			)}
		</section>
	);
}
