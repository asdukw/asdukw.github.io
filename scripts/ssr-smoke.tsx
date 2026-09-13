import { renderToString } from "react-dom/server";
import {
	createMemoryRouter,
	createRoutesFromElements,
	Route,
	RouterProvider,
} from "react-router";
import { ThemeProvider } from "@/lib/ThemeContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { Layout } from "@/components/layout/Layout";
import { Home } from "@/pages/Home";
import { PostListPage } from "@/pages/PostListPage";
import { PostDetailPage } from "@/pages/PostDetailPage";
import { Projects } from "@/pages/Projects";
import { About } from "@/pages/About";
import { NotFound } from "@/pages/NotFound";

function routesFor(paths: string[]) {
	for (const path of paths) {
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
		const html = renderToString(
			<ThemeProvider>
				<LanguageProvider>
					<RouterProvider router={router} />
				</LanguageProvider>
			</ThemeProvider>,
		);
		console.log(`${path}  →  ${html.length} chars`);
	}
	console.log("SSR smoke test passed.");
}

routesFor([
	"/",
	"/post",
	"/post/1",
	"/projects",
	"/about",
	"/does-not-exist",
]);
