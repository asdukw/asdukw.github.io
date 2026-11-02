import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { Search, X } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { getPosts, POST_INFO, type Post } from "@/lib/posts";
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

// 筛选状态全都放在 URL 里（?tag= 和 ?q=），刷新和分享都能还原。URL 里的值可能
// 来自旧链接或手改，不认识就当没筛选，而不是给一个空结果。
export function PostList({ showFilter = true }: { showFilter?: boolean }) {
	const { lang, t } = useLang();
	const [params, setParams] = useSearchParams();

	const posts = useMemo(() => getPosts(lang), [lang]);
	const tags = useMemo(
		() => Array.from(new Set(posts.flatMap((p) => p.tags))).sort(),
		[posts],
	);

	const requestedTag = params.get("tag");
	const tag = requestedTag && tags.includes(requestedTag) ? requestedTag : null;
	const query = (params.get("q") ?? "").trim();
	const needle = query.toLowerCase();

	const filtered = useMemo(() => {
		if (!tag && !needle) return posts;
		return posts.filter((post) => {
			if (tag && !post.tags.includes(tag)) return false;
			if (!needle) return true;
			return (
				post.title.toLowerCase().includes(needle) ||
				post.excerpt.toLowerCase().includes(needle) ||
				post.tags.some((item) => item.toLowerCase().includes(needle))
			);
		});
	}, [posts, tag, needle]);

	// 文章按日期倒序，所以同一年的会挨在一起，Map 保留插入顺序即可。
	const groups = useMemo(() => {
		const byYear = new Map<string, Post[]>();
		for (const post of filtered) {
			const year = post.date.slice(0, 4);
			const bucket = byYear.get(year);
			if (bucket) bucket.push(post);
			else byYear.set(year, [post]);
		}
		return Array.from(byYear.entries());
	}, [filtered]);

	const update = (patch: { tag?: string | null; q?: string }) => {
		const next = new URLSearchParams(params);
		if ("tag" in patch) {
			if (patch.tag) next.set("tag", patch.tag);
			else next.delete("tag");
		}
		if ("q" in patch) {
			const value = patch.q?.trim() ?? "";
			if (value) next.set("q", value);
			else next.delete("q");
		}
		setParams(next, { replace: true });
	};

	const info = POST_INFO;
	const filteredSomething = tag !== null || query.length > 0;

	return (
		<div>
			{showFilter && (
				<div className="mb-6 space-y-3">
					<div className="relative">
						<Search
							aria-hidden
							className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<input
							type="text"
							value={query}
							onChange={(event) => update({ q: event.target.value })}
							placeholder={t.list.search}
							aria-label={t.list.search}
							className="h-9 w-full rounded-md border border-border/60 bg-background pr-9 pl-9 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-ring/30"
						/>
						{query && (
							<button
								type="button"
								onClick={() => update({ q: "" })}
								aria-label={t.list.clear}
								className="absolute top-1/2 right-2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						)}
					</div>

					{tags.length > 0 && (
						<div className="flex flex-wrap items-center gap-2">
							<TagChip
								label={t.common.all}
								active={tag === null}
								onClick={() => {
									update({ tag: null });
									// pathname 没变，ScrollToTop 不会触发；筛选后回到列表
									// 顶部才看得见结果。
									window.scrollTo({ top: 0, behavior: "smooth" });
								}}
							/>
							{tags.map((item) => (
								<TagChip
									key={item}
									label={item}
									active={item === tag}
									onClick={() => {
										update({ tag: item === tag ? null : item });
										window.scrollTo({ top: 0, behavior: "smooth" });
									}}
								/>
							))}
						</div>
					)}
				</div>
			)}

			<p className="mb-4 text-xs text-muted-foreground">
				{t.list.total.replace(
					"{count,number,integer}",
					String(filtered.length),
				)}{" "}
				· {info.name[lang]}
			</p>

			{groups.length ? (
				<div className="space-y-8">
					{groups.map(([year, items]) => (
						<section key={year}>
							<h2 className="mb-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground tabular-nums">
								{year}
							</h2>
							<div>
								{items.map((post) => (
									<PostRow key={post.key} post={post} hideYear />
								))}
							</div>
						</section>
					))}
				</div>
			) : (
				<p className="py-16 text-center text-sm text-muted-foreground">
					{filteredSomething ? t.list.noResults : t.list.empty}
				</p>
			)}
		</div>
	);
}
