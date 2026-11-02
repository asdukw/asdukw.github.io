import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router";
import type { Lang } from "@/lib/posts";
import { dictionaries, type Dict } from "./dictionaries";
import { langOfPath, stripLang, withLang } from "./paths";

interface LanguageContextValue {
	lang: Lang;
	setLang: (lang: Lang) => void;
	toggleLang: () => void;
	t: Dict;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Provider 必须挂在 Router 里面：界面语言只由 URL 前缀决定，不读 localStorage，
// 这样同一个地址永远渲染同一份内容，构建期预渲染出来的 HTML 不会和首帧打架。
export function LanguageProvider({ children }: { children: ReactNode }) {
	const location = useLocation();
	const navigate = useNavigate();
	const lang = langOfPath(location.pathname);

	const setLang = useCallback(
		(next: Lang) => {
			if (next === langOfPath(location.pathname)) return;
			navigate(
				withLang(next, `${stripLang(location.pathname)}${location.search}`),
			);
		},
		[navigate, location.pathname, location.search],
	);

	const toggleLang = useCallback(() => {
		setLang(lang === "zh" ? "en" : "zh");
	}, [lang, setLang]);

	useEffect(() => {
		document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
	}, [lang]);

	const value = useMemo(
		() => ({ lang, setLang, toggleLang, t: dictionaries[lang] }),
		[lang, setLang, toggleLang],
	);

	return (
		<LanguageContext.Provider value={value}>
			{children}
		</LanguageContext.Provider>
	);
}

export function useLang(): LanguageContextValue {
	const ctx = useContext(LanguageContext);
	if (!ctx) {
		throw new Error("useLang must be used within a LanguageProvider");
	}
	return ctx;
}

/** 按当前界面语言构造站内链接，替代各处手写 `/post/...`。 */
export function useLangPath(): (path: string) => string {
	const { lang } = useLang();
	return useCallback((path: string) => withLang(lang, path), [lang]);
}
