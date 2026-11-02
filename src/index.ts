import { serve } from "bun";
import index from "./index.html";

const server = serve({
	routes: {
		// 文章图片：`public/**` 里的静态文件（构建时由 scripts/copy-assets.ts 复制进 dist）。
		"/images/*": async (req) => {
			const file = Bun.file(`./public${new URL(req.url).pathname}`);
			return (await file.exists()) ? new Response(file) : new Response("Not Found", { status: 404 });
		},
		"/*": index,
	},
	development: process.env.NODE_ENV !== "production" && {
		hmr: true,
		console: true,
	},
});

console.log(`🚀 Server running at ${server.url}`);
