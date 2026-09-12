import { serve } from "bun";
import index from "./index.html";

const server = serve({
	routes: {
		"/favicon.ico": {
			GET() {
				return new Response(
					Bun.file(new URL("./favicon.ico", import.meta.url)),
					{
						headers: {
							"Content-Type": "image/x-icon",
							"Cache-Control": "public, max-age=86400",
						},
					},
				);
			},
		},
		"/*": index,
	},
	development: process.env.NODE_ENV !== "production" && {
		hmr: true,
		console: true,
	},
});

console.log(`🚀 Server running at ${server.url}`);
