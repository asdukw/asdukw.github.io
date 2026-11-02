// 静态渲染冒烟：把每个路由渲染成字符串，断言文章管线确实产出了内容，并且
// 界面语言确实由 URL 前缀决定。渲染装配在 scripts/render-route.tsx，与构建期
// 预渲染共用。
//
//   bun scripts/ssr-smoke.tsx

import { existsSync } from "node:fs";
import { dictionaries } from "@/i18n/dictionaries";
import { langOfPath, stripLang, stripZhPrefix, withLang } from "@/i18n/paths";
import { getPost, getPosts } from "@/lib/posts";
import { searchPosts } from "@/lib/search";
import { tokenize } from "@/lib/tokenize";
import { renderRoute as render } from "./render-route";

let failures = 0;

function check(condition: boolean, message: string): void {
	if (condition) return;
	failures += 1;
	console.error(`✗ ${message}`);
}

const PATHS = [
	"/",
	"/post",
	"/post/1",
	"/post/2",
	"/about",
	"/en",
	"/en/post",
	"/en/post/1",
	"/en/post/2",
	"/en/about",
	"/does-not-exist",
	"/en/does-not-exist",
];

for (const path of PATHS) {
	const html = render(path);
	check(html.length > 0, `${path} rendered nothing`);
	console.log(`${path}  →  ${html.length} chars`);
}

const posts = getPosts("zh");
check(posts.length > 0, "no zh posts in src/generated/posts.ts");

const post = posts[0];
if (post) {
	const html = render(`/post/${post.id}`);
	check(html.includes(post.title), `post ${post.id} title missing from /post/${post.id}`);
	check(
		html.includes(post.toc[0]?.id ?? "\u0000"),
		`post ${post.id} headings missing from the rendered article`,
	);
}

// 界面语言由 URL 前缀决定：两种前缀下渲染出的导航文案必须不同，且不会互相
// 串台（串台说明语言又变回了运行时/存储里的状态）。
const zhAbout = dictionaries.zh.nav.about;
const enAbout = dictionaries.en.nav.about;
check(zhAbout !== enAbout, "zh and en nav labels are identical, assertion is useless");

const zhHome = render("/");
const enHome = render("/en");
check(
	zhHome.includes(zhAbout) && !zhHome.includes(enAbout),
	"/ rendered an unexpected interface language",
);
check(
	enHome.includes(enAbout) && !enHome.includes(zhAbout),
	"/en rendered an unexpected interface language",
);

// 没有英文正文的文章：界面英文、正文回退中文。
const zhOnly = posts.find((item) =>
	!getPosts("en").some((other) => other.lang === "en" && other.id === item.id),
);
if (zhOnly) {
	const html = render(`/en/post/${zhOnly.id}`);
	check(
		html.includes(zhOnly.title),
		`/en/post/${zhOnly.id} did not fall back to the ${zhOnly.lang} body`,
	);
	check(
		html.includes(enAbout),
		`/en/post/${zhOnly.id} did not render the English interface`,
	);
}

// 地址与语言的互转是纯函数，直接把边界钉住。
const pathCases: Array<[string, string]> = [
	[withLang("en", "/post/2"), "/en/post/2"],
	[withLang("zh", "/post/2"), "/post/2"],
	[withLang("en", "/"), "/en"],
	[withLang("en", "/post?tag=x"), "/en/post?tag=x"],
	[stripLang("/en/post/2"), "/post/2"],
	[stripLang("/en"), "/"],
	[stripZhPrefix("/zh/post/2"), "/post/2"],
	[stripZhPrefix("/zh"), "/"],
];
for (const [actual, expected] of pathCases) {
	check(actual === expected, `path helper returned ${actual}, expected ${expected}`);
}
check(langOfPath("/en/post") === "en", "langOfPath(/en/post) is not en");
check(langOfPath("/en") === "en", "langOfPath(/en) is not en");
check(langOfPath("/about") === "zh", "langOfPath(/about) is not zh");

// 分词是搜索的地基：中文没有空格，切成双字 bigram 才能被检索到。这三条覆盖
// 连续中文、中英混排和纯拉丁，任何一条挂了搜索都会静默变哑。
const tokenCases: Array<[string, string[]]> = [
	["把课件增量下载到本地", ["课件", "增量", "下载"]],
	["due.md 每 2 天", ["due.md", "2"]],
	["Bun + React 19", ["bun", "react", "19"]],
];
for (const [input, expected] of tokenCases) {
	const tokens = tokenize(input);
	for (const token of expected) {
		check(
			tokens.includes(token),
			`tokenize(${JSON.stringify(input)}) is missing ${JSON.stringify(token)} (got ${JSON.stringify(tokens)})`,
		);
	}
}
check(tokenize("!!!").length === 0, "tokenize(\"!!!\") produced tokens from punctuation alone");

// 搜索：正文可以搜到，空查询等于不筛选，同篇文章的中英版本不会同时出现。
const zhSearch = searchPosts("课件", "zh");
check(zhSearch !== undefined, "searchPosts(课件) returned undefined for a non-blank query");
check(
	Boolean(zhSearch?.some((hit) => hit.post.id === 2)),
	"searchPosts(课件, zh) did not find the bb-sync article",
);
check(
	(zhSearch?.filter((hit) => hit.post.id === 2).length ?? 0) === 1,
	"searchPosts(课件, zh) listed the same article more than once",
);
check(
	zhSearch?.every((hit) => hit.snippet.length > 0) ?? false,
	"search results carry no snippet",
);
check(searchPosts("   ", "zh") === undefined, "a blank query must mean 'no filter', not 'no results'");
check((searchPosts("zzzzqqqq", "zh")?.length ?? 0) === 0, "a nonsense query returned results");

// 英文界面、缺英文正文：回退到中文正文，且仍然只占一行。
const enSearch = searchPosts("课件", "en");
check(
	enSearch?.length === 1 && enSearch[0]?.post.lang === "zh",
	"searchPosts(课件, en) did not fall back to the zh body exactly once",
);
check(
	!searchPosts("bun", "en")?.some((hit) => hit.post.lang === "zh" && hit.post.id === 1),
	"searchPosts(bun, en) surfaced the zh version of an article that has an en body",
);

// 构建产物检查：只有跑过 `bun run build` 才有 dist。CI 里 smoke 在 build 之前
// 跑，所以这里只做条件检查；预渲染脚本自身会对每个写出的文件做同样的断言。
if (existsSync("dist/index.html")) {
	for (const item of posts) {
		const variants = [
			[`dist/post/${item.id}.html`, getPost(item.id, "zh")?.title],
			[`dist/en/post/${item.id}.html`, getPost(item.id, "en")?.title],
		] as const;
		for (const [file, title] of variants) {
			if (!title || !existsSync(file)) continue;
			const text = await Bun.file(file).text();
			const expectedTitle = `<title>${title} · `;
			check(
				text.includes(expectedTitle),
				`${file} is missing a per-page <title> (expected ${expectedTitle}…`,
			);
		}
	}
} else {
	console.log("(dist/ 不存在，跳过预渲染产物检查：先跑 bun run build)");
}

if (failures) {
	console.error(`SSR smoke test failed with ${failures} problem(s).`);
	process.exit(1);
}
console.log("SSR smoke test passed.");
