import type { Lang } from "./posts";

interface SiteConfig {
	name: string;
	tagline: Record<Lang, string>;
	description: Record<Lang, string>;
	github: string;
	/** Follows the GitHub profile picture; `?size` covers 2x rendering of the 96px hero. */
	avatar: string;
	mail: string;
	keywords: string[];
}

export const site: SiteConfig = {
	name: "asdukw",
	tagline: {
		zh: "记录代码与生活",
		en: "Coding and life, in writing",
	},
	description: {
		zh: "asdukw 的个人网站：记录代码、阅读与生活。",
		en: "asdukw's personal site: writing about code, reading, and life.",
	},
	github: "https://github.com/asdukw",
	avatar: "https://github.com/asdukw.png?size=200",
	mail: "asdukw@outlook.com",
	keywords: [
		"文章",
		"博客",
		"博客",
		"asdukw",
		"Python",
		"python",
	],
};
