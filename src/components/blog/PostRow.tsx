import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { useLang, useLangPath } from "@/i18n/LanguageContext";
import type { Post } from "@/lib/posts";

// 列表里的一行。整行都可点：标题链接上铺一层 after 伪元素盖住这一行，标签链接
// 用 z-10 浮在它上面。这样既保留「整行是链接」的手感，又不会出现 <a> 套 <a>。
//
// hideYear 用于按年份分组的列表：分组标题已经写了年份，行里再重复一遍是噪音。
export function PostRow({
	post,
	hideYear = false,
}: {
	post: Post;
	hideYear?: boolean;
}) {
	const { t } = useLang();
	const p = useLangPath();

	return (
		<article className="group relative border-b border-border/60 py-5 transition-colors first:pt-0 last:border-b-0 hover:border-border">
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<time dateTime={post.date} className="tabular-nums">
					{hideYear ? post.date.slice(5) : post.date}
				</time>
				<span aria-hidden>·</span>
				<span>
					{post.readingTime} {t.common.minRead}
				</span>
			</div>

			<h3 className="mt-1.5 text-base font-semibold leading-snug tracking-tight">
				<Link
					to={p(`/post/${post.id}`)}
					className="transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-brand"
				>
					{post.title}
				</Link>
			</h3>

			{post.excerpt && (
				<p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
					{post.excerpt}
				</p>
			)}

			{post.tags.length > 0 && (
				<div className="relative z-10 mt-3 flex flex-wrap items-center gap-1.5">
					{post.tags.slice(0, 4).map((tag) => (
						<Badge key={tag} variant="secondary" className="font-normal" asChild>
							<Link to={p(`/post?tag=${encodeURIComponent(tag)}`)}>{tag}</Link>
						</Badge>
					))}
				</div>
			)}
		</article>
	);
}
