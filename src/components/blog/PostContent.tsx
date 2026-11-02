import { useEffect, useRef } from "react";
import { useLang } from "@/i18n/LanguageContext";

const COPIED_MS = 1600;

// 正文 HTML 是构建期预渲染好的静态字符串（见 scripts/mdx.ts），所以代码块的
// 语言标签和复制按钮只能在客户端补。React 不会再去动这段 innerHTML，直接操作
// DOM 是安全的；html 或界面语言变化时先把上一次的包装还原，再按新文案重建。
export function PostContent({ html }: { html: string }) {
	const { t } = useLang();
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;

		for (const block of Array.from(root.querySelectorAll(".code-block"))) {
			const pre = block.querySelector("pre");
			if (pre) block.replaceWith(pre);
			else block.remove();
		}

		const cleanups: (() => void)[] = [];

		for (const pre of Array.from(root.querySelectorAll("pre"))) {
			const code = pre.querySelector("code");
			const lang = code?.className.match(/language-([\w+#.-]+)/)?.[1] ?? "";

			const block = document.createElement("div");
			block.className = "code-block";
			pre.replaceWith(block);

			const header = document.createElement("div");
			header.className = "code-block-header";

			const label = document.createElement("span");
			label.className = "code-block-lang";
			label.textContent = lang;

			const button = document.createElement("button");
			button.type = "button";
			button.className = "code-block-copy";
			button.textContent = t.common.copy;

			let timer: number | undefined;
			const onClick = async () => {
				try {
					await navigator.clipboard.writeText(
						code?.textContent ?? pre.textContent ?? "",
					);
				} catch {
					// 剪贴板不可用（非安全上下文、权限被拒）时不改按钮文案，避免
					// 提示“已复制”但其实什么都没发生。
					return;
				}
				button.textContent = t.common.copied;
				button.dataset.copied = "";
				window.clearTimeout(timer);
				timer = window.setTimeout(() => {
					button.textContent = t.common.copy;
					delete button.dataset.copied;
				}, COPIED_MS);
			};
			button.addEventListener("click", onClick);

			cleanups.push(() => {
				button.removeEventListener("click", onClick);
				window.clearTimeout(timer);
			});

			header.append(label, button);
			block.append(header, pre);
		}

		return () => {
			for (const cleanup of cleanups) cleanup();
		};
	}, [html, t]);

	return <div ref={rootRef} className="prose-article" dangerouslySetInnerHTML={{ __html: html }} />;
}
