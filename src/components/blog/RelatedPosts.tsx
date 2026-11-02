import { useMemo } from "react";
import { useLang } from "@/i18n/LanguageContext";
import { getPosts, type Post } from "@/lib/posts";
import { PostRow } from "./PostRow";

// 按标签重合度挑相关文章：现在文章少，重合 1 个标签就有意义；文章多了以后
// 可以换成按权重排序或加个下限。
export function RelatedPosts({
	post,
	limit = 2,
}: {
	post: Post;
	limit?: number;
}) {
	const { lang, t } = useLang();

	const related = useMemo(() => {
		return getPosts(lang)
			.filter((item) => item.id !== post.id)
			.map((item) => ({
				post: item,
				shared: item.tags.filter((tag) => post.tags.includes(tag)).length,
			}))
			.filter((entry) => entry.shared > 0)
			.sort((a, b) => b.shared - a.shared)
			.slice(0, limit)
			.map((entry) => entry.post);
	}, [lang, post, limit]);

	if (!related.length) return null;

	return (
		<section>
			<h2 className="mb-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground">
				{t.post.related}
			</h2>
			<div>
				{related.map((item) => (
					<PostRow key={item.key} post={item} />
				))}
			</div>
		</section>
	);
}
