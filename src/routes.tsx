import { Navigate, Route, useLocation } from "react-router";
import { stripZhPrefix } from "@/i18n/paths";
import { Home } from "@/pages/Home";
import { PostListPage } from "@/pages/PostListPage";
import { PostDetailPage } from "@/pages/PostDetailPage";
import { About } from "@/pages/About";

// 路由表放在这里而不是 App.tsx：smoke 脚本和构建期预渲染都要用同一棵树，
// 各写一份迟早会漂。`keyPrefix` 只用于 React 的 key，`langPrefix` 是真实前缀。

/** `/zh/post/2` 这种冗余写法归一化到 `/post/2`，避免同一内容有两个地址。 */
export function ZhPrefixRedirect() {
	const location = useLocation();
	const target = stripZhPrefix(location.pathname);
	return <Navigate to={`${target}${location.search}${location.hash}`} replace />;
}

export function pageRoutes(keyPrefix: string, langPrefix: string) {
	return [
		<Route key={`${keyPrefix}-home`} index element={<Home />} />,
		<Route key={`${keyPrefix}-posts`} path="post" element={<PostListPage />} />,
		<Route
			key={`${keyPrefix}-post`}
			path="post/:id"
			element={<PostDetailPage />}
		/>,
		<Route key={`${keyPrefix}-about`} path="about" element={<About />} />,
		// 项目已并成「关于」页的子章节，旧地址不退化成 404。
		<Route
			key={`${keyPrefix}-projects`}
			path="projects"
			element={<Navigate to={`${langPrefix}/about`} replace />}
		/>,
	];
}

/** 两种界面语言共用的路由子树：中文裸路径、英文 `/en` 子树、`/zh` 归一化。 */
export function langSubtrees() {
	return [
		...pageRoutes("zh", ""),
		<Route key="en" path="en">
			{pageRoutes("en", "/en")}
		</Route>,
		<Route key="zh-prefix" path="zh/*" element={<ZhPrefixRedirect />} />,
	];
}
