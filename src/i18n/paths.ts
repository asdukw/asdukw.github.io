import type { Lang } from "@/lib/posts";

// 界面语言是地址的一部分：中文用裸路径，英文加 `/en` 前缀。中文不带前缀
// 意味着已经分享出去的老链接语义不变，不需要重定向。
const EN_PREFIX = "/en";

/** 地址对应的界面语言。只认前缀，不读任何本地存储。 */
export function langOfPath(pathname: string): Lang {
	return pathname === EN_PREFIX || pathname.startsWith(`${EN_PREFIX}/`)
		? "en"
		: "zh";
}

/** 去掉语言前缀后的路径，用于切换语言时构造等价地址。 */
export function stripLang(pathname: string): string {
	if (pathname === EN_PREFIX) return "/";
	if (pathname.startsWith(`${EN_PREFIX}/`)) {
		return pathname.slice(EN_PREFIX.length);
	}
	return pathname;
}

/** `/zh/...` 是中文的冗余写法，归一化到不带前缀的地址。 */
export function stripZhPrefix(pathname: string): string {
	if (pathname === "/zh") return "/";
	if (pathname.startsWith("/zh/")) return pathname.slice("/zh".length);
	return pathname;
}

/** 给一个站内路径加上界面语言前缀；查询串和锚点原样保留。 */
export function withLang(lang: Lang, path: string): string {
	const base = path.startsWith("/") ? path : `/${path}`;
	if (lang === "zh") return base;

	const match = base.match(/^([^?#]*)(.*)$/);
	const pathname = match?.[1] || "/";
	const rest = match?.[2] ?? "";
	const prefixed = pathname === "/" ? EN_PREFIX : `${EN_PREFIX}${pathname}`;
	return `${prefixed}${rest}`;
}
