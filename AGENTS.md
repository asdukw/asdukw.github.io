# AGENTS.md

## Runtime

前端使用 Bun（不是 Node.js）和 React；动态数据直接使用 Supabase，不运行本地或线上 Python/FastAPI 后端。

## Commands

- `bun install` — install dependencies
- `bun dev` — dev server with HMR（先编译 CSS，再 `bun --hot src/index.ts`）
- `bun run build` — 生产构建：先编译 MDX 内容 → 再编译 Tailwind CSS → 再 `bun build ./src/index.html --outdir=dist`
- `bun run build:content` — 单独重新编译 MDX 内容（新增/修改文章后执行）
- `bun run build:content:watch` — 监听 `src/content/`，改动自动重新编译内容
- `bun run css` / `bun run css:watch` — 用 Tailwind v4 CLI 把 `src/index.css` 编译为 `src/styles.css`
- `bun start` — production server（`NODE_ENV=production`；静态资源可直接部署 `dist/`）
- `bun x tsc --noEmit` — TypeScript 类型检查
- `bun run deploy:pages` — 构建并用 Wrangler 部署 Cloudflare Pages

项目没有单独的 test runner、linter 或 formatter。Supabase schema 和函数迁移位于 `supabase/migrations/`，在 Supabase SQL Editor 或 Supabase CLI 流程中应用。

## Architecture

- `src/index.ts` — Bun 静态服务器：favicon、SPA shell 和开发 HMR；不包含业务 API 或 OAuth 密钥
- `src/index.html` — HTML shell，加载 `frontend.tsx`
- `src/frontend.tsx` — React 入口，挂载 `<App />`
- `src/App.tsx` — 根组件：`BrowserRouter` 路由 + `LanguageProvider` + `TooltipProvider`
- `src/pages/` — 每个路由页面对应一个文件（Home / PostListPage / PostDetailPage / Projects / About / NotFound）
- `src/components/` — `layout/`（Header/Footer/Layout）、`blog/`（文章卡片/列表/TOC/正文）、`home/`、`ui/`（shadcn）、`icons/`
- `src/i18n/` — 中英双语：`LanguageContext.tsx`（Provider + `useLang`）、`dictionaries.ts`（`Dict` 接口约束）
- `src/components/blog/CommentsSection.tsx` — 文章评论列表、发表评论与点赞 UI
- `src/lib/supabase.ts` — 使用公开 Supabase URL 和 publishable key 初始化浏览器 client
- `src/lib/auth.ts` / `src/lib/AuthContext.tsx` — Supabase Auth GitHub 登录、用户资料和管理员状态
- `src/lib/comments.ts` — 调用 Supabase RPC 的评论 client 与类型
- `supabase/migrations/20260906120000_initial.sql` — 表结构、Auth 用户同步、RLS 和评论/互动 RPC
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

- `src/index.ts` 只提供静态站点和 SPA fallback，所有动态功能都通过 Supabase client/RPC 完成
- 环境变量前缀为 `BUN_PUBLIC_` 的值会通过构建参数暴露给浏览器；只能放 Supabase URL 和 publishable key，绝不能放 `service_role` 或其他 secret key
- Path alias `@/*` maps to `./src/*`（定义在 `tsconfig.json`）
- HMR uses `import.meta.hot.data` pattern in `frontend.tsx`
- **Two lockfiles:** `bun.lock` 是权威文件；`package-lock.json` 已过时，忽略它
- **Two `index.html` files:** 根目录 `index.html` 是过时占位文件；真正的 app shell 是 `src/index.html`
- **路由用 `BrowserRouter`**（干净 URL，无 `#`）；部署到 Cloudflare Pages（`asdukw.pages.dev`），`scripts/copy-404.ts` 生成 `dist/_redirects`（`/* /index.html 200`）做 SPA fallback，深层链接/刷新按当前 pathname 渲染对应页面。**不要**生成 `dist/404.html`——Cloudflare Pages 只有在没有顶层 `404.html` 时才启用原生 SPA 渲染
- **生产站点**：`https://asdukw.pages.dev`（Cloudflare Pages 项目 `asdukw`，direct upload）；Supabase Auth 的 GitHub provider callback 使用 Supabase 项目域名，不再使用独立 OAuth Worker
- **评论区**：使用 Supabase Auth、Postgres RLS 和 RPC；按 `category/slug` 懒创建文章索引。GitHub 只作为 Supabase Auth 身份提供方
- favicon 由 ImageMagick 从头像生成（`magick src/assets/avatar.jpg -resize 64x64 -define icon:auto-resize=16,32,48,64 src/favicon.ico`）；`scripts/copy-favicon.ts` 在构建时复制 `dist/favicon.ico` 以便裸 `/favicon.ico` 也能访问，`src/index.ts` 内有 dev/static 路由
- `lucide-react` v1 已移除 `Github` 等品牌图标，用 `src/components/icons/GithubIcon.tsx` 内联 SVG
- npm/bun 安装遇到网络问题时，使用代理端口 7897：
  ```powershell
  $env:HTTP_PROXY='http://127.0.0.1:7897'; $env:HTTPS_PROXY='http://127.0.0.1:7897'; npm install ...
  ```

## CI/CD

- GitHub Actions 只有 `deploy.yml`：在 `master` 上按前端路径变化触发，也支持手动触发，负责构建并部署 Cloudflare Pages
- Pages CI 使用 `oven-sh/setup-bun@v2`，运行 `bun install --frozen-lockfile` 和 `bun run build`，再执行 `wrangler pages deploy`
- 需要 GitHub secrets：`BUN_PUBLIC_SUPABASE_URL`、`BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY`、`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` 只需要 Cloudflare Pages 部署权限；本地 Wrangler 可从根目录 `.env` 读取 token 和 account id，不要把 token 写入仓库配置
- Supabase 数据库迁移不在 Pages workflow 中自动执行；修改 `supabase/migrations/` 后，需要在 Supabase SQL Editor 或已配置的 Supabase CLI 流程中应用
- 新增文章后：本地跑 `bun run build:content` 生成内容并提交
