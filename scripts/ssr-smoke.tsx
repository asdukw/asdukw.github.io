// Renders every route to a string and checks that the static content pipeline
// actually produced an article. Run with `bun scripts/ssr-smoke.tsx`.
//
// The provider nesting mirrors src/App.tsx: rendering a route without it throws.

import { renderToString } from "react-dom/server";
import {
	createMemoryRouter,
	createRoutesFromElements,
	Route,
	RouterProvider,
} from "react-router";
import { AuthProvider } from "@/lib/AuthContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import { Home } from "@/pages/Home";
import { PostListPage } from "@/pages/PostListPage";
import { PostDetailPage } from "@/pages/PostDetailPage";
import { Projects } from "@/pages/Projects";
import { About } from "@/pages/About";
import { NotFound } from "@/pages/NotFound";
import { getPosts } from "@/lib/posts";

function render(path: string): string {
	const router = createMemoryRouter(
		createRoutesFromElements(
			<Route element={<Layout />}>
				<Route index element={<Home />} />
				<Route path="post" element={<PostListPage />} />
				<Route path="post/:id" element={<PostDetailPage />} />
				<Route path="projects" element={<Projects />} />
				<Route path="about" element={<About />} />
				<Route path="*" element={<NotFound />} />
			</Route>,
		),
		{ initialEntries: [path] },
	);

	return renderToString(
		<AuthProvider>
			<ThemeProvider>
				<LanguageProvider>
					<TooltipProvider>
						<RouterProvider router={router} />
					</TooltipProvider>
				</LanguageProvider>
			</ThemeProvider>
		</AuthProvider>,
	);
}

let failures = 0;

function check(condition: boolean, message: string): void {
	if (condition) return;
	failures += 1;
	console.error(`✗ ${message}`);
}

for (const path of ["/", "/post", "/post/1", "/projects", "/about", "/does-not-exist"]) {
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

if (failures) {
	console.error(`SSR smoke test failed with ${failures} problem(s).`);
	process.exit(1);
}
console.log("SSR smoke test passed.");
