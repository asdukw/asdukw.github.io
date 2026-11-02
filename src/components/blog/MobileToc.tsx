import { ChevronDown } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import type { TocItem } from "@/lib/posts";

// 桌面端的目录是右侧的固定侧栏（TOC.tsx），lg 以下那栏会消失，读者就没有目录了。
// 这里用原生 <details> 补一个可折叠版本：不需要 JS 状态，键盘和读屏直接可用。
export function MobileToc({ toc }: { toc: TocItem[] }) {
	const { t } = useLang();

	if (toc.length < 2) return null;

	return (
		<details className="group mb-6 rounded-lg border border-border/60 bg-muted/30 lg:hidden">
			<summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
				<span>
					{t.post.contents}
					<span className="ml-2 text-xs font-normal text-muted-foreground">
						{toc.length}
					</span>
				</span>
				<ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
			</summary>
			<ul className="border-t border-border/60 px-4 py-2">
				{toc.map((item) => (
					<li
						key={item.id}
						style={{ paddingLeft: `${(item.level - 2) * 0.75}rem` }}
					>
						<a
							href={`#${item.id}`}
							className="block py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							{item.text}
						</a>
					</li>
				))}
			</ul>
		</details>
	);
}
