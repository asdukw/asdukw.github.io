// 把一个路由渲染成字符串。smoke 和构建期预渲染共用这一份装配，避免「断言的
// 是 A 树、生成的是 B 树」。
//
// Provider 嵌套顺序镜像 src/App.tsx：`LanguageProvider` 要用 `useLocation`，
// 所以只能挂在 Router 之内，这里用一个包装路由承载它。

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
import { NotFound } from "@/pages/NotFound";
import { langSubtrees } from "@/routes";

function Root() {
	return (
		<LanguageProvider>
			<Layout />
		</LanguageProvider>
	);
}

export function renderRoute(path: string): string {
	const router = createMemoryRouter(
		createRoutesFromElements(
			<Route element={<Root />}>
				{langSubtrees()}
				<Route path="*" element={<NotFound />} />
			</Route>,
		),
		{ initialEntries: [path] },
	);

	return renderToString(
		<AuthProvider>
			<ThemeProvider>
				<TooltipProvider>
					<RouterProvider router={router} />
				</TooltipProvider>
			</ThemeProvider>
		</AuthProvider>,
	);
}
