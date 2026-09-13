import type { Lang } from "./posts";

interface SiteConfig {
	name: string;
	tagline: Record<Lang, string>;
	description: Record<Lang, string>;
	github: string;
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
