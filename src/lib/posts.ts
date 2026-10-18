import { POSTS, type GeneratedTocItem } from "@/generated/posts";

export type Lang = "zh" | "en";

export type TocItem = GeneratedTocItem;

export interface Post {
	id: number;
	key: string;
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

export function getPosts(lang: Lang, limit?: number): Post[] {
	const selected = ALL_POSTS.filter((post) => post.lang === lang);
	return limit === undefined ? selected : selected.slice(0, limit);
}

export function getPost(id: number, lang: Lang): Post | undefined {
	return ALL_POSTS.find((post) => post.id === id && post.lang === lang);
}

export function getPostTranslations(id: number): Post[] {
	return ALL_POSTS.filter((post) => post.id === id);
}
