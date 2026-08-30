# asdukw · 随笔与技术博客

基于 Bun + React + shadcn/ui 的个人网站，中英双语，GitHub Pages 静态部署。

## 技术栈

- **Bun** — 运行时与打包器
- **React 19 + react-router** — 前端框架与路由（HashRouter）
- **Tailwind CSS v4 + shadcn/ui** — 样式与 UI 组件
- **MDX** — 文章内容（`@mdx-js/mdx` 构建时编译为静态 HTML）

## 常用命令

```bash
bun install                 # 安装依赖
bun dev                     # 开发服务器（HMR）
bun run build:content       # 新增/修改文章后重新编译内容
bun run css                 # 编译 Tailwind CSS（dev/build 会自动执行）
bun run build               # 生产构建 → dist/
bun start                   # 仅启动 Bun 服务器
```

## 文章怎么加

1. 在 `src/content/<category>/` 下新建 `<slug>.<lang>.mdx`（category ∈ `blog|tech`，lang ∈ `zh|en`）
2. frontmatter 包含 `title`、`date`、`tags`、`excerpt`
3. 本地跑 `bun run build:content` 生成 `src/generated/content.ts` 并提交

## 部署

`dist/` 由 GitHub Actions 自动构建并部署到 GitHub Pages（push 到 `master` 触发）。