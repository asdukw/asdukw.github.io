# 样式

## Tailwind v4

- `src/index.css` 是唯一源文件（含 `@theme inline` 与暗色模式变量）。
- 构建时用 `@tailwindcss/cli` 编译为 `src/styles.css` 供 App 引用（受 `bun build` 自身不支持 `@theme` 限制）。
- 命令：`bun run css` / `bun run css:watch`。`src/styles.css` 自动生成但需要提交到 git。
- 主题变量采用 shadcn v4 变量间接模式（`:root` 基变量 + `@theme inline` 映射）；`components.json` 定义 shadcn 生成目标。

## 暗色模式

- 由 `.dark` class 控制（`src/lib/ThemeContext.tsx` + `@custom-variant dark`）。
- 默认跟随系统（`prefers-color-scheme`），可手动切浅/深色并持久化到 `localStorage["site.theme"]`（light/dark/system）。
- `src/index.html` 内有内联脚本，首屏前根据存储/系统偏好设置 `.dark` class，避免闪白。

## 文章正文

`.prose-article` 是文章正文的样式作用域，由 `PostContent.tsx` 渲染预生成的 HTML。改渲染器时要同时确认 `scripts/mdx.ts` 输出的标签结构：

- 标题是 `<h2 id="x"><a href="#x">…</a></h2>`
- 代码块是 `<code class="hljs language-xx">`
