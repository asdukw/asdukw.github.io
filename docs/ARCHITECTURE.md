# 架构与代码地图

## 数据流

`src/content/**.mdx` → `scripts/mdx.ts` → `scripts/build-content.ts` → `src/generated/posts.ts` → `src/lib/posts.ts` → 页面组件。

- `scripts/mdx.ts`：gray-matter 解析 frontmatter → remark-gfm → `@mdx-js/mdx` 的 `evaluate` → rehype-slug / rehype-autolink-headings / rehype-highlight → `renderToStaticMarkup`。HTML 在构建期生成，浏览器不打包 `@mdx-js/mdx`。
- `scripts/build-content.ts`：遍历 `src/content/` 并写出 `src/generated/posts.ts` 与 `src/generated/search.ts`。

搜索是这条流水线的支线，正文只编译一次：

`scripts/build-content.ts` → `scripts/search-index.ts` → `src/generated/search.ts` → `src/lib/search.ts` → `components/blog/PostList.tsx`

- `scripts/search-index.ts`：按 h2/h3 把预渲染 HTML 切成段落，剥标签留纯文本；文章级那一段保留标题、摘要和标签，所以旧的「按标题/摘要/标签搜索」不会因为改成全文搜索而变差。
- `src/lib/search.ts`：浏览器侧用 MiniSearch 建倒排（19 段，毫秒级），按界面语言过滤、按文章聚合、截命中片段。查询不联网。
- `src/lib/tokenize.ts`：CJK 双字 bigram + 拉丁整词。索引和查询共用这一份；不要另写一份实现。
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
- `src/App.tsx` — 根组件：`BrowserRouter` + `LanguageProvider` + `TooltipProvider`，路由子树来自 `src/routes.tsx`
- `src/routes.tsx` — 路由树：中文裸路径与 `/en` 子树共用同一组页面组件，`/zh/*` 归一化重定向也在这里。smoke 脚本与构建期预渲染复用这棵树
- `src/pages/` — 每个路由页面对应一个文件（Home / PostListPage / PostDetailPage / About / NotFound）
- `src/components/` — `layout/`（Header/Footer/Layout）、`blog/`（文章行 `PostRow`/列表/正文/目录/作者卡/相关文章）、`home/`（Hero/RecentPosts/AboutBlock）、`ui/`（shadcn）、`icons/`
- `src/i18n/` — 中英双语：`LanguageContext.tsx`（Provider + `useLang` / `useLangPath`）、`paths.ts`（地址与语言的互转）、`dictionaries.ts`（`Dict` 接口约束）
- `src/content/` — 文章源文件，一篇一个 MDX，文件名 `<name>.<lang>.mdx`（写法见 [CONTENT.md](CONTENT.md)）
- `public/` — 文章图片等不经 bundler 的静态文件，`scripts/copy-assets.ts` 原样复制到 `dist/`（`bun build` 只输出 import 进来的资源）
- `src/generated/posts.ts` — 自动生成的核心数据文件，构建期产物
- `src/generated/search.ts` — 自动生成的搜索段落数据（`scripts/search-index.ts`），构建期产物
- `src/generated/projects.ts` — 自动生成的 pinned 仓库列表（`scripts/fetch-projects.ts`），构建期产物
- `src/lib/api.ts` — 评论 API 的 base URL、bearer token 读写和 `apiJson` 封装
- `src/lib/auth.ts` / `src/lib/AuthContext.tsx` — GitHub 登录（跳转 Worker）、会话 token 管理和管理员状态
- `src/lib/comments.ts` — 评论 API client 与类型
- `src/components/blog/CommentsSection.tsx` — 评论列表、发表评论、树形回复与点赞 UI
- `src/lib/ThemeContext.tsx` — 浅色 / 深色 / 跟随系统（见 [STYLING.md](STYLING.md)）
- `worker/` — 评论 / 认证 Worker（见 [COMMENT-API.md](COMMENT-API.md)）
- `src/styles.css` — 自动生成，由 Tailwind CLI 从 `src/index.css` 编译（见 [STYLING.md](STYLING.md)）
- `scripts/prerender.tsx` — 构建期把每个公开路由渲染成扁平 `.html`（`dist/post/2.html`），注入该页专属的 `<title>` / `canonical` / `og:*` / `hreflang`
- `scripts/build-seo.ts` — 从 `site` 和 `getPosts` 生成 `robots.txt`、`sitemap.xml`、`rss.xml`、`en/rss.xml`

## 渲染与 SEO

- **运行时是纯客户端渲染**：`src/frontend.tsx` 用 `createRoot().render()`，不做 hydration。预渲染出的 HTML 在 JS 加载后会被 React 清空重建，它的价值只在「爬虫和分享卡片不跑 JS 也能拿到正确元信息与正文」。改动渲染方式时（比如换成 `hydrateRoot`）要先看 `openspec` 里的 `add-seo-and-i18n-urls` 设计记录：首帧一致性会被 `ThemeProvider`、`AuthContext` 这类浏览器状态打破。
- 预渲染与 smoke 共用 `scripts/render-route.tsx` 的同一套 Provider/路由装配，路由表在 `src/routes.tsx`；三者不要各写一份。
- 每个页面的元信息在 `scripts/prerender.tsx` 的 `metaFor()` 里集中生成；站点根地址来自 `src/lib/site.ts` 的 `baseUrl`，默认分享图是 `site.ogImage`（文章可用 frontmatter 的 `image` 覆盖，见 [CONTENT.md](CONTENT.md)）。
- `hreflang` 只给「中英文正文都存在」的文章配对：只有中文正文的文章在 `/en/post/{id}` 上仍是中文正文，声明 `hreflang="en"` 等于骗搜索引擎。

## 路由与语言

- 路由用 `BrowserRouter`，干净 URL（无 `#`）；文章地址是 `/post/{id}`。SPA fallback 与构建参数见 [DEPLOYMENT.md](DEPLOYMENT.md)。
- **界面语言由 URL 前缀决定**：无前缀是中文（`/post/2`），`/en` 前缀是英文（`/en/post/2`）。`/zh/...` 是冗余写法，重定向到去前缀的等价地址。语言**不再存进 `localStorage`**，所以同一个地址永远渲染同一份内容——这是构建期预渲染能成立的前提。
- 站内链接一律用 `useLangPath()`（`src/i18n/LanguageContext.tsx`）构造，不要手写 `/post/...`；它按当前界面语言补前缀并保留查询串。语言切换按钮是导航（`navigate(等价地址)`），不是替换文案。
- 界面文案走 `src/i18n/dictionaries.ts`，类型由 `Dict` 接口约束；新增文案要同时补 `zh` / `en`。
- 文章语言由 frontmatter 的 `lang` 决定，与界面语言无关。英文版本是可选的：`getPosts` / `getPost` 按 `id` 只留一份，优先界面语言，缺英文正文时回退 `FALLBACK_LANG`（`zh`），所以 en 界面在只有中文正文时仍正常显示中文原文（`/en/post/2` 是英文界面 + 中文正文）。`PostDetailPage` 用 `getPostTranslations` 找另一语言版本，比较基准是正文语言而非界面语言。

## 约定

- **三个 generated 文件都必须提交**：`src/generated/posts.ts`、`src/generated/projects.ts`、`src/generated/search.ts`。CI 对每一个都有 `git diff --exit-code` 漂移检查，改了 MDX 却没重新跑 `bun run build:content` 会直接失败。

- Path alias `@/*` → `./src/*`（定义在 `tsconfig.json`）。
- **两个 lockfile**：`bun.lock` 是权威文件；`package-lock.json` 已过时，忽略它。
- `worker/` 有独立的 `tsconfig.json`（用 `@cloudflare/workers-types`），根配置 exclude 掉了它，两边类型检查分开跑。
- `lucide-react` v1 已移除 `Github` 等品牌图标，用 `src/components/icons/GithubIcon.tsx` 内联 SVG。
- 标签页图标跟随 GitHub 头像：`scripts/fetch-icon.ts` 在构建时抓 `site.avatar` 写回 `src/icon.png`（必须提交到 git，抓取失败时保留现状）；`bun build` 再把它打包成 `dist/` 里带 hash 的资源。GitHub 按上传时的原始格式返回字节（本账号是 JPEG，虽然 URL 以 `.png` 结尾），所以 `src/index.html` 的 `<link rel="icon">` 不写 `type`，由浏览器嗅探。
