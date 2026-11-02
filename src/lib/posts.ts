import { POSTS, type GeneratedTocItem } from "@/generated/posts";

export type Lang = "zh" | "en";

// 界面语言（Lang）和正文语言可以不一致：站点默认只有中文正文，en 只作为
// display language，缺英文版本时回退到这里的语言。
export const FALLBACK_LANG: Lang = "zh";

export type TocItem = GeneratedTocItem;

export interface Post {
	id: number;
	key: string;
	/** 正文语言；回退时可能与界面语言不同 */
	lang: Lang;
	title: string;
	date: string;
	tags: string[];
	excerpt: string;
	readingTime: number;
	html: string;
	toc: TocItem[];
}

export const POST_INFO = {
	name: { zh: "文章", en: "Posts" },
	description: {
		zh: "个人思考、技术实践与生活记录",
		en: "Thoughts, engineering notes, and life in words",
	},
} satisfies { name: Record<Lang, string>; description: Record<Lang, string> };

// src/generated/posts.ts is produced by `bun run build:content`, which already sorts
// newest first. There is no runtime fetch: the HTML is pre-rendered at build time.
const ALL_POSTS: Post[] = POSTS.map((post) => ({
	id: post.id,
	key: `${post.id}.${post.lang}`,
	lang: post.lang,
	title: post.title,
	date: post.date,
	tags: post.tags,
	excerpt: post.excerpt,
	readingTime: post.readingTime,
	html: post.html,
	toc: post.toc,
}));

// 同一篇文章的中英文版本共用一个 id。按 id 只留一份：优先界面语言，缺了回退
// FALLBACK_LANG，再缺就用任意可用版本，避免在 en 界面下整站变成空列表。
function preferredVersion(versions: [Post, ...Post[]], lang: Lang): Post {
	return (
		versions.find((post) => post.lang === lang) ??
		versions.find((post) => post.lang === FALLBACK_LANG) ??
		versions[0]
	);
}

// ALL_POSTS 已是日期倒序，同一篇的各语言版本紧邻且顺序一致；Map 保留首次插入
// 的位置，所以去重后仍是有序的。
function selectPosts(lang: Lang): Post[] {
	const byId = new Map<number, [Post, ...Post[]]>();
	for (const post of ALL_POSTS) {
		const versions = byId.get(post.id);
		if (versions) versions.push(post);
		else byId.set(post.id, [post]);
	}
	return Array.from(byId.values(), (versions) =>
		preferredVersion(versions, lang),
	);
}

export function getPosts(lang: Lang, limit?: number): Post[] {
	const selected = selectPosts(lang);
	return limit === undefined ? selected : selected.slice(0, limit);
}

export function getPost(id: number, lang: Lang): Post | undefined {
	const [first, ...rest] = ALL_POSTS.filter((post) => post.id === id);
	return first ? preferredVersion([first, ...rest], lang) : undefined;
}

export function getPostTranslations(id: number): Post[] {
	return ALL_POSTS.filter((post) => post.id === id);
}
