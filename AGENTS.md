# AGENTS.md

## Runtime

前端使用 Bun（不是 Node.js）和 React。文章是仓库里的 MDX，构建期编译成静态数据，运行时**不需要任何数据库**。评论和 GitHub 登录由 `worker/` 里一个独立的 Cloudflare Worker 提供，数据存在 Cloudflare D1。

## Commands

- `bun install` — install dependencies
- `bun dev` — 编译文章和 CSS，再起 dev server（`bun --hot src/index.ts`）
- `bun run dev:api` — 本地跑评论 Worker（`wrangler dev`，默认 `http://localhost:8787`）
- `bun run build` — 生产构建：编译文章 → 编译 Tailwind CSS → `bun build ./src/index.html --outdir=dist`
- `bun run build:content` — 把 `src/content/**.mdx` 编译成 `src/generated/posts.ts`
- `bun run css` / `bun run css:watch` — 用 Tailwind v4 CLI 把 `src/index.css` 编译为 `src/styles.css`
- `bun start` — production server（`NODE_ENV=production`；静态资源可直接部署 `dist/`）
- `bun run typecheck` — 前端 TypeScript 类型检查（CI 使用）
- `bun run typecheck:worker` — Worker TypeScript 类型检查（CI 使用，独立的 `worker/tsconfig.json`）
- `bun run lint` — 使用 ESLint 检查 TypeScript/React 代码
- `bun run smoke` — 把每个路由 SSR 渲染成字符串并断言文章标题/标题锚点确实渲染出来了（CI 使用）
- `bun run deploy:pages` — 构建并用 Wrangler 部署 Cloudflare Pages
- `bun run deploy:api` — 用 Wrangler 部署评论 Worker

项目没有单独的 test runner、linter 或 formatter。

## Architecture

- `src/index.ts` — Bun 静态服务器：favicon、SPA shell 和开发 HMR；不包含业务 API 或 OAuth 密钥
- `src/index.html` — HTML shell，加载 `frontend.tsx`
- `src/frontend.tsx` — React 入口，挂载 `<App />`
- `src/App.tsx` — 根组件：`BrowserRouter` 路由 + `LanguageProvider` + `TooltipProvider`
- `src/pages/` — 每个路由页面对应一个文件（Home / PostListPage / PostDetailPage / Projects / About / NotFound）
- `src/components/` — `layout/`（Header/Footer/Layout）、`blog/`（文章卡片/列表/TOC/正文）、`home/`、`ui/`（shadcn）、`icons/`
- `src/i18n/` — 中英双语：`LanguageContext.tsx`（Provider + `useLang`）、`dictionaries.ts`（`Dict` 接口约束）
- `src/content/` — 文章源文件，一篇一个 MDX，文件名 `<name>.<lang>.mdx`
- `src/generated/posts.ts` — **自动生成**，由 `scripts/build-content.ts` 从 `src/content/` 编译，需要提交到 git
- `scripts/mdx.ts` — MDX 编译核心：gray-matter 解析 frontmatter → remark-gfm → `@mdx-js/mdx` 的 `evaluate` → rehype-slug / rehype-autolink-headings / rehype-highlight → `renderToStaticMarkup`
- `scripts/build-content.ts` — 遍历 `src/content/` 并写出 `src/generated/posts.ts`
- `src/lib/posts.ts` — 文章数据访问层（`getPosts` / `getPost` / `getPostTranslations`），直接读生成数据，**没有网络请求、没有 loading 状态**；页面组件不要直接 import `@/generated/posts`
- `src/lib/api.ts` — 评论 API 的 base URL、bearer token 读写和 `apiJson` 封装
- `src/lib/auth.ts` / `src/lib/AuthContext.tsx` — GitHub 登录（跳转 Worker）、会话 token 管理和管理员状态
- `src/lib/comments.ts` — 评论 API client 与类型
- `src/components/blog/CommentsSection.tsx` — 文章评论列表、发表评论、树形回复与点赞 UI
- `worker/` — 评论 / 认证 Worker：`src/index.ts`（路由）、`src/auth.ts`（GitHub OAuth）、`src/session.ts`（会话）、`src/comments.ts`（评论查询）、`src/http.ts`（CORS/cookie/JSON）、`schema.sql`（D1 表结构）、`wrangler.toml`
- `src/styles.css` — **自动生成**，由 Tailwind CLI 从 `src/index.css` 编译，需要提交到 git

## Content（仓库里的 MDX）

- 文章的权威来源是 `src/content/*.mdx`，**不再有数据库**。前端也不编译 MDX：HTML 在构建期由 `scripts/mdx.ts` 预渲染，浏览器不打包 `@mdx-js/mdx`。
- frontmatter 字段：`id`（正整数，同一文章的中英文版本共用）、`lang`（`zh | en`）、`title`、`date`（`YYYY-MM-DD`）、`tags`（数组）、`excerpt`。
- 公开地址用 frontmatter 的 `id`：`/post/{id}`。id 一旦发布就不要再改，否则评论会和文章对不上。
- **加/改文章的流程**：写或改 `src/content/<name>.<lang>.mdx` → `bun run build:content` → 把 `src/generated/posts.ts` 一起提交。CI 会跑 `git diff --exit-code src/generated/posts.ts`，生成文件和 MDX 不同步会直接失败。
- 支持的语法是 Markdown + GFM（表格、删除线、任务列表）。**不支持自定义 JSX 组件**：站点渲染的是静态 HTML，没有东西可以 hydrate。
- 目录（TOC）只收集 h2/h3，由 `scripts/mdx.ts` 在 rehype-slug 之后抽取。
- 文章顺序由 `scripts/build-content.ts` 统一排序（日期倒序，其次 id 倒序），不要依赖文件名顺序。
- 删文章只删 MDX，评论会留在 D1 里变成孤儿；需要手动清理：`delete from comments where post_id = N;`（见 `worker/schema.sql` 顶部注释）。

## Comment API（Cloudflare Worker + D1）

- Worker 与前端**不同源**（`*.workers.dev` vs `asdukw.pages.dev`），所以会话 token 走 `Authorization: Bearer`，存在 `localStorage["site.session"]`，不用 cookie——跨站 cookie 在多个浏览器里默认被拦截。
- OAuth 回调用 URL fragment 传 token（`#token=...`），不会进入服务端日志或 Referer；`consumeSessionToken()` 读取后立刻用 `history.replaceState` 清掉地址栏。
- 端点：`GET /api/auth/login`、`GET /api/auth/callback`、`GET /api/auth/user`、`POST /api/auth/logout`、`GET|POST /api/comments`、`POST /api/comments/:id/like`、`POST /api/comments/:id/status`（管理员隐藏评论）、`GET /api/health`。
- 错误统一返回 `{ error: "code" }`；前端把网络失败映射成 503 `comments_unavailable`，评论区显示"暂时不可用"而不是报错。
- `ALLOWED_ORIGINS` 同时用于 CORS 和登录后的跳转白名单（防开放重定向）。加自定义域名时要同时改它和 `SITE_URL`。
- 管理员由 `ADMIN_GITHUB_LOGINS`（逗号分隔的 GitHub login）决定，登录时写入 `users.is_admin`。GitHub login 可以改名，改名后要同步更新这个变量。
- 会话只存 SHA-256 哈希，30 天过期；过期记录在下次登录时顺带清理。

### 首次部署 Worker

```bash
bun x wrangler d1 create asdukw-comments          # 把 database_id 填进 worker/wrangler.toml
bun x wrangler d1 execute asdukw-comments --remote --file worker/schema.sql
bun x wrangler secret put GH_CLIENT_SECRET --config worker/wrangler.toml
bun run deploy:api
```

`d1 create` / `d1 execute --remote` / `secret put` 都需要 `CLOUDFLARE_API_TOKEN` 有 **D1: Edit** 和 **Workers Scripts: Edit** 权限，只有 Pages 权限会在第一步就失败。

GitHub OAuth App 的 callback 必须指向 `https://<worker>.workers.dev/api/auth/callback`；改了 Worker 名字或域名要同步改。

## Styling

- Tailwind CSS v4，`src/index.css` 是唯一源文件（含 `@theme inline` 与暗色模式变量）
- 构建时用 `@tailwindcss/cli` 编译为 `src/styles.css` 供 App 引用（受 `bun build` 自身不支持 `@theme` 限制）
- 主题变量采用 shadcn v4 变量间接模式（`:root` 基变量 + `@theme inline` 映射）
- 暗色模式由 `.dark` class 控制（`src/lib/ThemeContext.tsx` + `@custom-variant dark`），默认跟随系统（`prefers-color-scheme`），可手动切浅/深色并持久化到 `localStorage["site.theme"]`（light/dark/system）
- `src/index.html` 内有内联脚本，首屏前根据存储/系统偏好设置 `.dark` class，避免闪白
- `.prose-article` 是文章正文的样式作用域，由 `PostContent.tsx` 渲染预生成的 HTML；改渲染器时要同时确认 `scripts/mdx.ts` 输出的标签结构（标题是 `<h2 id="x"><a href="#x">…</a></h2>`，代码块是 `<code class="hljs language-xx">`）

## Gotchas

- 文章是纯静态的：**没有 API 也要能正常显示**。`src/lib/api.ts` 在缺少 `BUN_PUBLIC_API_BASE` 时不会抛错，只让评论区显示不可用。
- 本地 `.env` 里的 `BUN_PUBLIC_API_BASE=http://localhost:8787` 是给 `bun dev` + `bun run dev:api` 用的。本地直接跑 `bun run deploy:pages` 会把这个地址打进包里，正式部署要走 CI（真实环境变量优先于 `.env`，CI 的 secret 会覆盖它）
- 环境变量前缀为 `BUN_PUBLIC_` 的值会通过构建参数暴露给浏览器；只能放公开信息（目前只有 `BUN_PUBLIC_API_BASE`），GitHub client secret 只能放在 Worker secret 里
- `worker/` 有独立的 `tsconfig.json`（用 `@cloudflare/workers-types`），根 `tsconfig.json` 把它 exclude 掉了；两边的类型检查要分别跑
- Path alias `@/*` maps to `./src/*`（定义在 `tsconfig.json`）
- HMR uses `import.meta.hot.data` pattern in `frontend.tsx`
- **Two lockfiles:** `bun.lock` 是权威文件；`package-lock.json` 已过时，忽略它
- **Two `index.html` files:** 根目录 `index.html` 是过时占位文件；真正的 app shell 是 `src/index.html`
- **路由用 `BrowserRouter`**（干净 URL，无 `#`）；部署到 Cloudflare Pages（`asdukw.pages.dev`），`scripts/copy-404.ts` 生成 `dist/_redirects`（`/* /index.html 200`）做 SPA fallback，深层链接/刷新按当前 pathname 渲染对应页面。**不要**生成 `dist/404.html`——Cloudflare Pages 只有在没有顶层 `404.html` 时才启用原生 SPA 渲染
- **构建必须带 `--public-path=/`**。`bun build` 默认把 `index.html` 里的资源写成相对路径（`./index-xxx.js`），在 `/post/1` 这种深层链接上刷新时浏览器会解析成 `/post/index-xxx.js`；该路径没有静态文件，Pages 的 SPA fallback 就把 `index.html` 当 JS 返回（200 + `text/html`），浏览器报 `SyntaxError`、应用白屏。删掉这个参数会让所有深层链接的刷新挂掉
- **生产站点**：`https://asdukw.pages.dev`（Cloudflare Pages 项目 `asdukw`，direct upload）；评论 Worker 是独立部署
- favicon 由 ImageMagick 从头像生成（`magick src/assets/avatar.jpg -resize 64x64 -define icon:auto-resize=16,32,48,64 src/favicon.ico`）；`scripts/copy-favicon.ts` 在构建时复制 `dist/favicon.ico` 以便裸 `/favicon.ico` 也能访问，`src/index.ts` 内有 dev/static 路由
- `lucide-react` v1 已移除 `Github` 等品牌图标，用 `src/components/icons/GithubIcon.tsx` 内联 SVG
- npm/bun 安装遇到网络问题时，使用代理端口 7897：
  ```powershell
  $env:HTTP_PROXY='http://127.0.0.1:7897'; $env:HTTPS_PROXY='http://127.0.0.1:7897'; npm install ...
  ```

## CI/CD

- GitHub Actions 只有 `deploy.yml`，在 `master` 上按前端 / Worker 路径变化触发，也支持手动触发。两个 job：`deploy-pages` 构建并部署 Pages，`deploy-worker` 部署评论 Worker（Worker 只在 `worker/**` 等路径变化时才有实际改动，但两个 job 都会跑）
- 两个 job 都用 `oven-sh/setup-bun@v2` 和 `bun install --frozen-lockfile`
- `deploy-pages` 的顺序：`build:content` → 检查 `src/generated/posts.ts` 没有未提交的漂移 → `typecheck` → `typecheck:worker` → `lint` → `build` → `wrangler pages deploy`
- 需要 GitHub secrets：`BUN_PUBLIC_API_BASE`、`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` 需要三个权限：Account → **Cloudflare Pages: Edit**（部署前端）、**Workers Scripts: Edit**（部署 Worker）、**D1: Edit**（执行 `d1 execute --remote`）。只给 Pages 权限时 `wrangler d1 execute --remote` 会报 `Authentication error [code: 10000]`。本地 Wrangler 从根目录 `.env` 读取 token 和 account id，不要把 token 写入仓库配置
- D1 表结构变更不在 workflow 中自动执行，需要手动跑 `bun x wrangler d1 execute asdukw-comments --remote --file worker/schema.sql`。`schema.sql` 全部用 `create ... if not exists`，重复执行是安全的；**改已有表时不要直接改 `schema.sql` 里的定义**，要另写一段 `alter table` 并手动执行
