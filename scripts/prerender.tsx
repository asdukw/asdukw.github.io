// 构建期预渲染：把每个公开路由渲染成一份自带专属 <head> 的静态 HTML。
//
//   bun scripts/prerender.tsx        # 需要在 `bun build` 之后、copy-404 之前
//
// 用途只有两个：爬虫和分享卡片不跑 JS 也能拿到正确的 title / description /
// og:*，以及正文出现在 HTML 源码里。运行时仍然是 createRoot：JS 加载完成后会
// 清空并重建 DOM，所以这里不做 hydration（见 design.md D4）。
//
// 输出形式是扁平文件而不是目录式 index.html：Cloudflare Pages 对
// `post/2/index.html` 会 308 到 `/post/2/`，而 `post/2.html` 直接以 200 命中
// `/post/2`（见 design.md D5 与 docs/DEPLOYMENT.md）。
//
// 壳是 `bun build` 产出的 `dist/index.html`，锚点是它里面的
// `<!--head:start-->` / `<!--head:end-->` 与 `<div id="root"></div>`。

import { site } from "@/lib/site";
import { getPost, getPostTranslations, getPosts, POST_INFO, type Lang } from "@/lib/posts";
import { dictionaries } from "@/i18n/dictionaries";
import { langOfPath, stripLang } from "@/i18n/paths";
import { renderRoute } from "./render-route";

const DIST = "dist";
const SHELL = `${DIST}/index.html`;
const HEAD_START = "<!--head:start-->";
const HEAD_END = "<!--head:end-->";
const ROOT_OPEN = '<div id="root"></div>';

const shell = await Bun.file(SHELL).text();

// 锚点漂移（比如 bundler 行为变化）必须在构建时炸掉，而不是产出一批没有
// 元信息的页面。所以先检查再动手。
for (const anchor of [HEAD_START, HEAD_END, ROOT_OPEN]) {
	if (!shell.includes(anchor)) {
		console.error(`prerender: ${SHELL} 里找不到注入锚点 ${anchor}`);
		process.exit(1);
	}
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function absolute(path: string): string {
	return `${site.baseUrl}${path}`;
}

interface PageMeta {
	title: string;
	description: string;
	ogType: "website" | "article";
	/** 该页的公开地址（canonical 用），不含查询串。 */
	path: string;
	image: string;
	/** 只有中英文正文都存在时才配对。 */
	alternates?: { zh: string; en: string };
	publishedTime?: string;
}

function metaFor(path: string): PageMeta {
	const lang = langOfPath(path);
	const inner = stripLang(path);
	const postMatch = inner.match(/^\/post\/(\d+)$/);
	const post = postMatch ? getPost(Number(postMatch[1]), lang) : undefined;

	if (post) {
		const translations = getPostTranslations(post.id);
		const zhPost = translations.find((item) => item.lang === "zh");
		const enPost = translations.find((item) => item.lang === "en");
		return {
			title: `${post.title} · ${site.name}`,
			description: post.excerpt || site.description[lang],
			ogType: "article",
			path,
			image: post.image ?? site.ogImage,
			publishedTime: post.date,
			// 只有中文正文时不声明 en：/en/post/{id} 上其实还是中文正文。
			alternates:
				zhPost && enPost
					? { zh: `/post/${post.id}`, en: `/en/post/${post.id}` }
					: undefined,
		};
	}

	if (inner === "/") {
		return {
			title: site.name,
			description: site.description[lang],
			ogType: "website",
			path,
			image: site.ogImage,
		};
	}

	const title = inner === "/post" ? POST_INFO.name[lang] : dictionaries[lang].nav.about;
	return {
		title: `${title} · ${site.name}`,
		description: site.description[lang],
		ogType: "website",
		path,
		image: site.ogImage,
	};
}

function headFor(meta: PageMeta, lang: Lang): string {
	const tags = [
		`<title>${escapeHtml(meta.title)}</title>`,
		`<meta name="description" content="${escapeHtml(meta.description)}" />`,
		`<link rel="canonical" href="${escapeHtml(absolute(meta.path))}" />`,
		`<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
		`<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
		`<meta property="og:type" content="${meta.ogType}" />`,
		`<meta property="og:url" content="${escapeHtml(absolute(meta.path))}" />`,
		`<meta property="og:image" content="${escapeHtml(absolute(meta.image))}" />`,
		`<meta property="og:site_name" content="${escapeHtml(site.name)}" />`,
		`<meta property="og:locale" content="${lang === "zh" ? "zh_CN" : "en_US"}" />`,
		`<meta name="twitter:card" content="summary_large_image" />`,
	];

	if (meta.publishedTime) {
		tags.push(
			`<meta property="article:published_time" content="${meta.publishedTime}" />`,
		);
	}

	if (meta.alternates) {
		tags.push(
			`<link rel="alternate" hreflang="zh" href="${escapeHtml(absolute(meta.alternates.zh))}" />`,
			`<link rel="alternate" hreflang="en" href="${escapeHtml(absolute(meta.alternates.en))}" />`,
			`<link rel="alternate" hreflang="x-default" href="${escapeHtml(absolute(meta.alternates.zh))}" />`,
		);
	}

	return tags.map((tag) => `    ${tag}`).join("\n");
}

/** 路由 → 输出文件（相对 dist/），与 Cloudflare Pages 的扁平 .html 解析一致。 */
function outputFileFor(path: string): string {
	if (path === "/") return "index.html";
	if (path === "/en") return "en.html";
	return `${path.replace(/^\//, "")}.html`;
}

const routes = ["/", "/post", "/about", "/en", "/en/post", "/en/about"];
for (const post of getPosts("zh")) {
	routes.push(`/post/${post.id}`, `/en/post/${post.id}`);
}

const written: string[] = [];
for (const path of routes) {
	const lang = langOfPath(path);
	const meta = metaFor(path);
	const body = renderRoute(path);

	let html = shell
		.replace(
			/<!--head:start-->[\s\S]*?<!--head:end-->/,
			`${HEAD_START}\n${headFor(meta, lang)}\n    ${HEAD_END}`,
		)
		.replace(ROOT_OPEN, `<div id="root">${body}</div>`);

	// 壳里的 <html lang> 是中文；英文页要改掉，否则朗读器和搜索引擎会误判语言。
	html = html.replace(
		/<html lang="[^"]*">/,
		`<html lang="${lang === "zh" ? "zh-CN" : "en"}">`,
	);

	// 注入后自检：标题必须出现在产物里，否则说明锚点位置或渲染出了问题。
	if (!html.includes(`<title>${escapeHtml(meta.title)}</title>`)) {
		console.error(`prerender: ${path} 的 <title> 没写进产物`);
		process.exit(1);
	}
	if (!html.includes(`<link rel="canonical" href="${absolute(meta.path)}"`)) {
		console.error(`prerender: ${path} 的 canonical 没写进产物`);
		process.exit(1);
	}

	const file = `${DIST}/${outputFileFor(path)}`;
	await Bun.write(file, html);
	written.push(file);
}

console.log(`✓ 预渲染 ${written.length} 个页面 → dist/（扁平 .html）`);
for (const file of written) console.log(`  ${file}`);
