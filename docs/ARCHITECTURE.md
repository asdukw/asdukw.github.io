# 架构与代码地图

## 数据流

`src/content/**.mdx` → `scripts/mdx.ts` → `scripts/build-content.ts` → `src/generated/posts.ts` → `src/lib/posts.ts` → 页面组件。

- `scripts/mdx.ts`：gray-matter 解析 frontmatter → remark-gfm → `@mdx-js/mdx` 的 `evaluate` → rehype-slug / rehype-autolink-headings / rehype-highlight → `renderToStaticMarkup`。HTML 在构建期生成，浏览器不打包 `@mdx-js/mdx`。
- `scripts/build-content.ts`：遍历 `src/content/` 并写出 `src/generated/posts.ts`。
- `src/lib/posts.ts`：文章数据访问层（`getPosts` / `getPost` / `getPostTranslations`），直接读生成数据，没有网络请求、没有 loading 状态。

项目列表是另一条独立的流水线：

`GitHub GraphQL User.pinnedItems` → `scripts/fetch-projects.ts` → `src/generated/projects.ts` → `src/lib/projects.ts` → `components/about/ProjectsSection.tsx`

- pinned 仓库只能通过 GraphQL 拿，REST 的 `/users/{login}/repos` 没有这个字段。所以 `fetch-projects.ts` 需要一个 token：本地读 `GH_TOKEN` / `GITHUB_TOKEN`，没有就退回 `gh auth token`；CI 里由 `deploy.yml` 注入 `${{ github.token }}`。
- 抓取失败只打警告并保留已提交的 `projects.ts`，不阻塞构建。
- 卡片用的是仓库 description 原文，所以这块是中英混排的；要双语就在 `src/lib/projects.ts` 里加 override。

## 文件职责

- `src/index.ts` — Bun 静态服务器：SPA shell 和开发 HMR；不包含业务 API 或 OAuth 密钥
- `src/index.html` — HTML shell，加载 `frontend.tsx`（根目录的 `index.html` 是过时占位文件）
- `src/frontend.tsx` — React 入口，挂载 `<App />`；HMR 用 `import.meta.hot.data` 模式
- `src/App.tsx` — 根组件：`BrowserRouter` 路由 + `LanguageProvider` + `TooltipProvider`
- `src/pages/` — 每个路由页面对应一个文件（Home / PostListPage / PostDetailPage / Projects / About / NotFound）
- `src/components/` — `layout/`（Header/Footer/Layout）、`blog/`（文章行 `PostRow`/列表/正文/目录/作者卡/相关文章/进度条）、`home/`（Hero/RecentPosts/AboutBlock）、`ui/`（shadcn）、`icons/`
- `src/i18n/` — 中英双语：`LanguageContext.tsx`（Provider + `useLang`）、`dictionaries.ts`（`Dict` 接口约束）
- `src/content/` — 文章源文件，一篇一个 MDX，文件名 `<name>.<lang>.mdx`（写法见 [CONTENT.md](CONTENT.md)）
- `src/generated/posts.ts` — 自动生成的核心数据文件，构建期产物
- `src/generated/projects.ts` — 自动生成的 pinned 仓库列表（`scripts/fetch-projects.ts`），构建期产物
- `src/lib/api.ts` — 评论 API 的 base URL、bearer token 读写和 `apiJson` 封装
- `src/lib/auth.ts` / `src/lib/AuthContext.tsx` — GitHub 登录（跳转 Worker）、会话 token 管理和管理员状态
- `src/lib/comments.ts` — 评论 API client 与类型
- `src/components/blog/CommentsSection.tsx` — 评论列表、发表评论、树形回复与点赞 UI
- `src/lib/ThemeContext.tsx` — 浅色 / 深色 / 跟随系统（见 [STYLING.md](STYLING.md)）
- `worker/` — 评论 / 认证 Worker（见 [COMMENT-API.md](COMMENT-API.md)）
- `src/styles.css` — 自动生成，由 Tailwind CLI 从 `src/index.css` 编译（见 [STYLING.md](STYLING.md)）

## 路由与语言

- 路由用 `BrowserRouter`，干净 URL（无 `#`）；文章地址是 `/post/{id}`。SPA fallback 与构建参数见 [DEPLOYMENT.md](DEPLOYMENT.md)。
- 界面文案走 `src/i18n/dictionaries.ts`，类型由 `Dict` 接口约束；新增文案要同时补 `zh` / `en`。
- 文章语言由 frontmatter 的 `lang` 决定。英文版本是可选的：`getPosts` / `getPost` 按 `id` 只留一份，优先界面语言，缺英文正文时回退 `FALLBACK_LANG`（`zh`），所以 en 界面在只有中文正文时仍正常显示中文原文。`PostDetailPage` 用 `getPostTranslations` 找另一语言版本，比较基准是正文语言而非界面语言。

## 约定

- Path alias `@/*` → `./src/*`（定义在 `tsconfig.json`）。
- **两个 lockfile**：`bun.lock` 是权威文件；`package-lock.json` 已过时，忽略它。
- `worker/` 有独立的 `tsconfig.json`（用 `@cloudflare/workers-types`），根配置 exclude 掉了它，两边类型检查分开跑。
- `lucide-react` v1 已移除 `Github` 等品牌图标，用 `src/components/icons/GithubIcon.tsx` 内联 SVG。
- 标签页图标跟随 GitHub 头像：`scripts/fetch-icon.ts` 在构建时抓 `site.avatar` 写回 `src/icon.png`（必须提交到 git，抓取失败时保留现状）；`bun build` 再把它打包成 `dist/` 里带 hash 的资源。GitHub 按上传时的原始格式返回字节（本账号是 JPEG，虽然 URL 以 `.png` 结尾），所以 `src/index.html` 的 `<link rel="icon">` 不写 `type`，由浏览器嗅探。
