// 文章的静态图片：`public/**` 原样复制到 `dist/**`（保持同样的相对路径）。
//
// Bun 的 HTML bundler 只会输出「从代码里 import 进来」的资源，而文章里的
// `![…](/images/foo.png)` 是 Markdown 写的、构建期直接变成 <img src>，
// 不经过 bundler，所以需要这一步把文件搬到 dist 下。
import { existsSync } from "node:fs";
import { cp, readdir } from "node:fs/promises";

if (existsSync("public")) {
	// 逐个顶层条目复制：node:fs/promises 的 cp 把 src 整个搬到 dest 下，
	// 直接 cp("public", "dist") 会得到 dist/public/…，不是我们要的路径。
	for (const entry of await readdir("public")) {
		await cp(`public/${entry}`, `dist/${entry}`, { recursive: true });
	}
	console.log("✓ public/ → dist/（文章图片）");
}
