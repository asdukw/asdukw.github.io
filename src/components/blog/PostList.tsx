import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { useLang } from "@/i18n/LanguageContext";
import { getPosts, POST_INFO } from "@/lib/posts";
import { PostRow } from "./PostRow";

function TagChip({
	label,
	active,
	onClick,
}: {
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
				active
					? "border-brand/40 bg-brand-muted text-brand"
					: "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
			}`}
		>
			{label}
		</button>
	);
}

export function PostList({
	showFilter = true,
}: {
	showFilter?: boolean;
}) {
	const { lang, t } = useLang();
	const [params, setParams] = useSearchParams();

	const posts = useMemo(() => getPosts(lang), [lang]);
	const tags = useMemo(
		() => Array.from(new Set(posts.flatMap((p) => p.tags))).sort(),
		[posts],
	);

	// 筛选状态放在 URL 里，刷新和分享都能保留。URL 里的 tag 可能来自旧链接或
	// 手改，不在列表里就当没筛选，而不是给一个空结果。
	const requested = params.get("tag");
	const tag = requested && tags.includes(requested) ? requested : null;
	const filtered = tag ? posts.filter((p) => p.tags.includes(tag)) : posts;
	const info = POST_INFO;

	const select = (next: string | null) => {
		setParams(next ? { tag: next } : {}, { replace: true });
		// pathname 没变，ScrollToTop 不会触发；筛选后回到列表顶部才看得见结果。
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	return (
		<div>
			{showFilter && tags.length > 0 && (
				<div className="mb-6 flex flex-wrap items-center gap-2">
					<TagChip
						label={t.common.all}
						active={tag === null}
						onClick={() => select(null)}
					/>
					{tags.map((item) => (
						<TagChip
							key={item}
							label={item}
							active={item === tag}
							onClick={() => select(item === tag ? null : item)}
						/>
					))}
				</div>
			)}

			<p className="mb-2 text-xs text-muted-foreground">
				{t.list.total.replace(
					"{count,number,integer}",
					String(filtered.length),
				)}{" "}
				· {info.name[lang]}
			</p>

			{filtered.length ? (
				<div>
					{filtered.map((post) => (
						<PostRow key={post.key} post={post} />
					))}
				</div>
			) : (
				<p className="py-16 text-center text-sm text-muted-foreground">
					{t.list.empty}
				</p>
			)}
		</div>
	);
}
