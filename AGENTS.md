# AGENTS.md

## Runtime

Bun, not Node.js. All commands use `bun`.

## Commands

- `bun install` — install dependencies
- `bun dev` — dev server with HMR（先编译 CSS，再 `bun --hot src/index.ts`）
- `bun run build` — 生产构建：先编译 MDX 内容 → 再编译 Tailwind CSS → 再 `bun build ./src/index.html --outdir=dist`
- `bun run build:content` — 单独重新编译 MDX 内容（新增/修改文章后执行）
- `bun run build:content:watch` — 监听 `src/content/`，改动自动重新编译内容
- `bun run css` / `bun run css:watch` — 用 Tailwind v4 CLI 把 `src/index.css` 编译为 `src/styles.css`
- `bun start` — production server（`NODE_ENV=production`；注意：只起 Bun 服务器，静态资源请用 `dist/` 部署到 GitHub Pages）

No test runner, linter, or formatter is configured. `bun x tsc --noEmit` 可做类型检查。

## Architecture

- `src/index.ts` — Bun HTTP server与路由定义（`"/*"` 回落到 `index.html` SPA shell）
- `src/index.html` — HTML shell，加载 `frontend.tsx`
- `src/frontend.tsx` — React 入口，挂载 `<App />`
- `src/App.tsx` — 根组件：`BrowserRouter` 路由 + `LanguageProvider` + `TooltipProvider`
- `src/pages/` — 每个路由页面对应一个文件（Home / PostListPage / PostDetailPage / Projects / About / NotFound）
- `src/components/` — `layout/`（Header/Footer/Layout）、`blog/`（文章卡片/列表/TOC/正文）、`home/`、`ui/`（shadcn）、`icons/`
- `src/i18n/` — 中英双语：`LanguageContext.tsx`（Provider + `useLang`）、`dictionaries.ts`（zh/en 文案，`Dict` 接口约束）
- `src/generated/content.ts` — **自动生成**，由 `scripts/build-content.ts` 产出，需要提交到 git（否则 dev 无内容）
- `src/styles.css` — **自动生成**，由 Tailwind CLI 从 `src/index.css` 编译，需要提交到 git

## Content (MDX 流水线)

- 文章放在 `src/content/<category>/<slug>.<lang>.mdx`
- `category` ∈ `blog | tech`，`lang` ∈ `zh | en`
- frontmatter：`title`、`date`（YYYY-MM-DD）、`tags`、`excerpt`
- `scripts/build-content.ts` 用 `gray-matter` 解析、`@mdx-js/mdx` 编译、`react-dom/server` 渲染为静态 HTML，并生成 TOC、阅读时长
- 代码高亮使用 `rehype-highlight`（hljs classes，样式在 `src/index.css` 中手写）
- 类型与查询函数在 `src/lib/posts.ts`（`getPosts` / `getPost` / `getPostTranslations`）

## Styling

- Tailwind CSS v4，`src/index.css` 是唯一源文件（含 `@theme inline` 与暗色模式变量）
- 构建时用 `@tailwindcss/cli` 编译为 `src/styles.css` 供 App 引用（受 `bun build` 自身不支持 `@theme` 限制）
- 主题变量采用 shadcn v4 变量间接模式（`:root` 基变量 + `@theme inline` 映射）
- 暗色模式由 `.dark` class 控制（`src/lib/ThemeContext.tsx` + `@custom-variant dark`），默认跟随系统（`prefers-color-scheme`），可手动切浅/深色并持久化到 `localStorage["site.theme"]`（light/dark/system）
- `src/index.html` 内有内联脚本，首屏前根据存储/系统偏好设置 `.dark` class，避免闪白

## Gotchas

- Server routes are defined inline in `src/index.ts` — no separate router file
- Env vars prefixed `BUN_PUBLIC_` are exposed to client via `--env` flag
- HMR uses `import.meta.hot.data` pattern in `frontend.tsx`
- **Two lockfiles:** `bun.lock` is authoritative; `package-lock.json` is stale — ignore it
- **Two `index.html` files:** root `index.html` is a stale placeholder; the real app shell is `src/index.html`
- **路由用 `BrowserRouter`**（干净 URL，无 `#`）；GitHub Pages 不做 SPA fallback，靠 `scripts/copy-404.ts` 生成 `dist/404.html`（`<base href="/">` + 内联 assets）来兜底深层链接/刷新的 404，SPA 客户端路由再按当前 pathname 渲染对应页面
- favicon 由 ImageMagick 从头像生成（`magick src/assets/avatar.jpg -resize 64x64 -define icon:auto-resize=16,32,48,64 src/favicon.ico`）；`scripts/copy-favicon.ts` 在构建时复制 `dist/favicon.ico` 以便裸 `/favicon.ico` 也能访问，`src/index.ts` 内有 dev 环境的路由
- `lucide-react` v1 已移除 `Github` 等品牌图标，用 `src/components/icons/GithubIcon.tsx` 内联 SVG
- npm/bun 安装遇到网络问题时，使用代理端口 7897：
  ```powershell
  $env:HTTP_PROXY='http://127.0.0.1:7897'; $env:HTTPS_PROXY='http://127.0.0.1:7897'; npm install ...
  ```

## CI/CD

- GitHub Actions deploys `dist/` to GitHub Pages on push to `master` (`deploy.yml`)
- CI uses `oven-sh/setup-bun@v2`, runs `bun install` then `bun run build`（已包含内容与 CSS 编译）
- 新增文章后：本地跑 `bun run build:content` 生成内容并提交
