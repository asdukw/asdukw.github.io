// 标签页图标跟随 GitHub 头像（src/lib/site.ts 的 site.avatar）。但 favicon 必须是
// 构建期能被打包进 dist 的本地文件，所以在这里抓一次、写回 src/icon.png。
//
// 两点现实：
// - 抓不到（离线、被墙、GitHub 抖动）就保留仓库里已提交的那一份，不阻塞构建。
// - GitHub 按上传时的原始格式返回字节，这个账号是 image/jpeg，即使 URL 以 .png
//   结尾。因此 src/index.html 的 <link rel="icon"> 不写 type，交给浏览器嗅探。

import { site } from "@/lib/site";

const OUTPUT = new URL("../src/icon.png", import.meta.url);
const TIMEOUT_MS = 10_000;

function sniffFormat(bytes: Uint8Array): string {
	if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
	if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
	if (bytes.length > 6 && bytes[0] === 0x47 && bytes[1] === 0x49) return "image/gif";
	if (bytes.length > 12 && bytes[8] === 0x57 && bytes[9] === 0x45) return "image/webp";
	return "unknown";
}

try {
	const response = await fetch(site.avatar, {
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});
	if (!response.ok) throw new Error(`HTTP ${response.status}`);

	const bytes = new Uint8Array(await response.arrayBuffer());
	const format = sniffFormat(bytes);
	if (format === "unknown") throw new Error("unrecognised image format");

	await Bun.write(OUTPUT, bytes);
	const kb = (bytes.length / 1024).toFixed(1);
	console.log(`✓ icon.png ← ${site.avatar} (${format}, ${kb} KB)`);
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.warn(`! 头像抓取失败，保留当前 src/icon.png：${message}`);
}
