# 样式

## Tailwind v4

- `src/index.css` 是唯一源文件（含 `@theme inline` 与暗色模式变量）。
- 构建时用 `@tailwindcss/cli` 编译为 `src/styles.css` 供 App 引用（受 `bun build` 自身不支持 `@theme` 限制）。
- 命令：`bun run css` / `bun run css:watch`。`src/styles.css` 自动生成但需要提交到 git。
- 主题变量采用 shadcn v4 变量间接模式（`:root` 基变量 + `@theme inline` 映射）；`components.json` 定义 shadcn 生成目标。

## 颜色

- 语义色在 `src/index.css` 的 `:root` / `.dark` 里用 oklch 定义。
- `--primary` 故意保持近黑 / 近白：按钮、标题、引用块左边线都不带色。
- 全站唯一的彩色是 `--brand`（搭配 `--brand-muted`、`--brand-foreground`，可写 `text-brand` / `bg-brand-muted` / `border-brand/40`）。它只出现在链接 hover、active 导航、focus ring（`--ring`）、选中文字和代码关键字上。换风格只改 `:root` 和 `.dark` 里那三行。
- 暗色下 `background < card < popover` 是有意的分层。把它们改成同一个值会让卡片又只剩一根边框。
- `::selection` 用 `--selection`，不要改回 `color-mix()`：lightningcss 会把它降级成满不透明度的兜底色。

## 暗色模式

- 由 `.dark` class 控制（`src/lib/ThemeContext.tsx` + `@custom-variant dark`）。
- 默认跟随系统（`prefers-color-scheme`），可手动切浅/深色并持久化到 `localStorage["site.theme"]`（light/dark/system）。
- `src/index.html` 内有内联脚本，首屏前根据存储/系统偏好设置 `.dark` class，避免闪白。

## 文章正文

`.prose-article` 是文章正文的样式作用域，由 `PostContent.tsx` 渲染预生成的 HTML。改渲染器时要同时确认 `scripts/mdx.ts` 输出的标签结构：

- 标题是 `<h2 id="x"><a href="#x">…</a></h2>`
- 代码块是 `<code class="hljs language-xx">`

### 代码块

正文 HTML 是构建期定死的字符串，所以语言标签和复制按钮是 `PostContent.tsx` 在客户端 effect 里补的：它把每个 `<pre>` 包进 `.code-block` 并前置一个头部。改这里时注意两点：

- effect 每次重建前会先把上一次的包装还原，所以换语言时按钮文案能正确更新。
- 没有 JS 时 `<pre>` 保留自己的边框和圆角，不要删掉 `.prose-article pre` 那组规则。

高亮颜色是一套 `--code-*` 变量，暗色只覆盖变量，不要再在 `.dark` 里重复写选择器。
