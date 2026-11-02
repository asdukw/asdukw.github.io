import type { Lang } from "./posts";

interface SiteConfig {
	name: string;
	description: Record<Lang, string>;
	/**站点的公开根地址（带协议、不带尾斜杠）。canonical / sitemap / RSS 都从这里拼绝对地址，
	 * 不要在脚本里另写一份。 */
	baseUrl: string;
	/** 默认分享图（`public/` 下，相对路径）；文章可用 frontmatter 的 `image` 覆盖。 */
	ogImage: string;
	github: string;
	/** Follows the GitHub profile picture; `?size` covers 2x rendering of the 96px hero. */
	avatar: string;
	mail: string;
	keywords: string[];
}

export const site: SiteConfig = {
	name: "asdukw",
	baseUrl: "https://asdukw.pages.dev",
	ogImage: "/og.png",
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
