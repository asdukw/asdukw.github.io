// 生成 robots.txt / sitemap.xml / rss.xml 三个纯静态产物。
//
//   构建后：bun scripts/build-seo.ts
//
// 输入只有两处：`site`（站点根地址、分享图）和 `getPosts`（按界面语言去重后的
// 文章列表）。这里不引入任何新的数据源，也不做按篇生成图片。
//
// 两条规则值得记住：
//   - canonical / 绝对地址一律从 `site.baseUrl` 拼，脚本里不另写域名。
//   - hreflang 只给「中英文正文都存在」的文章配对：只有中文正文的文章在
//     /en/post/{id} 上仍然是中文正文，声明 hreflang="en" 等于告诉搜索引擎
//     那是英文页面。

import { site } from "@/lib/site";
import { getPostTranslations, getPosts, POST_INFO, type Lang } from "@/lib/posts";

const DIST = new URL("../dist/", import.meta.url);
const LANGS: Lang[] = ["zh", "en"];

function absolute(path: string): string {
	return `${site.baseUrl}${path}`;
}

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function langPath(lang: Lang, path: string): string {
	if (lang === "zh") return path;
	return path === "/" ? "/en" : `/en${path}`;
}

const posts = getPosts("zh");
const latestDate = posts[0]?.date ?? "1970-01-01";

interface Entry {
	path: string;
	lastmod: string;
	/** 成对的语言版本；只有文章才可能非空。 */
	alternates?: Record<Lang, string>;
}

const entries: Entry[] = [];
for (const lang of LANGS) {
	entries.push({ path: langPath(lang, "/"), lastmod: latestDate });
	entries.push({ path: langPath(lang, "/post"), lastmod: latestDate });
	entries.push({ path: langPath(lang, "/about"), lastmod: latestDate });
}

for (const post of posts) {
	// 正文语言是否两版都在，决定这条文章地址能不能配对。
	const translations = getPostTranslations(post.id);
	const hasBoth = LANGS.every((lang) =>
		translations.some((item) => item.lang === lang),
	);
	const alternates = hasBoth
		? {
				zh: absolute(langPath("zh", `/post/${post.id}`)),
				en: absolute(langPath("en", `/post/${post.id}`)),
			}
		: undefined;

	for (const lang of LANGS) {
		entries.push({
			path: langPath(lang, `/post/${post.id}`),
			lastmod: post.date,
			alternates,
		});
	}
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries
	.map((entry) => {
		const lines = [
			"  <url>",
			`    <loc>${escapeXml(absolute(entry.path))}</loc>`,
			`    <lastmod>${entry.lastmod}</lastmod>`,
		];
		if (entry.alternates) {
			for (const lang of LANGS) {
				lines.push(
					`    <xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(entry.alternates[lang])}"/>`,
				);
			}
			lines.push(
				`    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(entry.alternates.zh)}"/>`,
			);
		}
		lines.push("  </url>");
		return lines.join("\n");
	})
	.join("\n")}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${absolute("/sitemap.xml")}
`;

// 文章 HTML 里的图片是根绝对路径，feed 里没有「根」的概念，必须补上域名。
function absolutizeHtml(html: string): string {
	return html.replace(
		/(src|href)="\/(?!\/)/g,
		(_match, attr: string) => `${attr}="${site.baseUrl}/`,
	);
}

function rss(lang: Lang): string {
	const items = getPosts(lang)
		.map((post) => {
			const link = absolute(langPath(lang, `/post/${post.id}`));
			const pubDate = new Date(`${post.date}T00:00:00Z`).toUTCString();
			return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
      <content:encoded><![CDATA[${absolutizeHtml(post.html)}]]></content:encoded>
    </item>`;
		})
		.join("\n");

	const self = absolute(langPath(lang, "/rss.xml"));
	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${site.name} · ${POST_INFO.name[lang]}`)}</title>
    <link>${escapeXml(absolute(langPath(lang, "/")))}</link>
    <description>${escapeXml(site.description[lang])}</description>
    <language>${lang === "zh" ? "zh-CN" : "en"}</language>
    <atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

await Bun.write(new URL("robots.txt", DIST), robots);
await Bun.write(new URL("sitemap.xml", DIST), sitemap);
await Bun.write(new URL("rss.xml", DIST), rss("zh"));
await Bun.write(new URL("en/rss.xml", DIST), rss("en"));

console.log(
	`✓ robots.txt / sitemap.xml (${entries.length} urls) / rss.xml / en/rss.xml → dist/`,
);
