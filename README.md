# asdukw · 随笔与技术博客

基于 Bun + React 19 + shadcn/ui 的个人网站，中英双语，部署在 Cloudflare Pages：<https://asdukw.pages.dev>。

文章是仓库里的 MDX，构建期预渲染成 HTML 静态数据，**运行时不依赖任何数据库**；评论和 GitHub 登录由 `worker/` 里一个独立的 Cloudflare Worker + D1 提供，站点没有评论 API 时也能正常浏览。

## 技术栈

- **Bun** — 开发运行时、打包器与静态服务器
- **React 19 + react-router** — 页面与路由（`BrowserRouter`，干净 URL）
- **Tailwind CSS v4 + shadcn/ui** — 样式与 UI 组件，支持浅色 / 深色 / 跟随系统
- **MDX（构建期）** — 文章源文件经 `scripts/mdx.ts` 预渲染为静态 HTML
- **Cloudflare Pages** — 静态站点托管
- **Cloudflare Workers + D1** — 评论、点赞、GitHub OAuth 会话

## 本地开发

```bash
bun install
bun dev          # 编译文章 + CSS，然后起 dev server（默认 http://localhost:3000）
```

`.env` 只需要一个前端可见变量：

```text
BUN_PUBLIC_API_BASE=http://localhost:8787   # 指向本地评论 Worker；缺省时评论区显示"暂时不可用"
```

想连本地评论 Worker（GitHub 登录、发评论）：

```bash
bun run dev:api  # wrangler dev，跑 worker/，默认 http://localhost:8787
```

`BUN_PUBLIC_*` 变量会进入浏览器构建产物，只能放公开信息；GitHub client secret 只存在 Worker secret 里。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `bun dev` | 编译内容与 CSS，起 dev server（HMR） |
| `bun run build` | 生产构建 → `dist/` |
| `bun start` | 以 production 模式跑 Bun 静态服务器 |
| `bun run build:content` | `src/content/*.mdx` → `src/generated/posts.ts` |
| `bun run css` / `css:watch` | Tailwind CLI 编译 `src/index.css` → `src/styles.css` |
| `bun run typecheck` / `typecheck:worker` | 前端 / Worker 各自的 TypeScript 检查 |
| `bun run lint` | ESLint |
| `bun run smoke` | SSR 渲染所有路由，断言文章标题与标题锚点存在 |
| `bun run dev:api` / `deploy:api` | 本地运行 / 部署评论 Worker |
| `bun run deploy:pages` | 构建并部署 Cloudflare Pages |

没有独立的 test runner 或 formatter。

## 写文章

文章源文件是 `src/content/<name>.<lang>.mdx`，同一篇文章的中英文版本共用同一个 `id`：

```yaml
---
id: 1
lang: zh          # zh | en
title: "标题"
date: "2026-08-28"
tags: ["Bun", "React"]
excerpt: "摘要"
---
```

流程是：写 MDX → `bun run build:content` → **把 `src/generated/posts.ts` 一起提交**。CI 会检查生成文件与 MDX 是否同步。

- 公开地址用 `id`：`/post/1`。id 发布后不要再改，否则评论会对不上文章。
- 正文支持 Markdown + GFM（表格、删除线、任务列表），**不支持自定义 JSX 组件**——站点渲染的是静态 HTML，没有东西可以 hydrate。
- 目录（TOC）只收集 h2/h3。
- 删文章只删 MDX，评论会留在 D1 里变成孤儿，需要手动清理。

## 评论 Worker

`worker/` 是一个独立的 Cloudflare Worker，代码分 `index.ts`（路由）、`auth.ts`（GitHub OAuth）、`session.ts`、`comments.ts`、`http.ts`，表结构在 `worker/schema.sql`。

- 端点：`GET /api/auth/login`、`GET /api/auth/callback`、`GET /api/auth/user`、`POST /api/auth/logout`、`GET|POST /api/comments`、`POST /api/comments/:id/like`、`POST /api/comments/:id/status`（管理员隐藏评论）、`GET /api/health`。
- 前端与 Worker 不同源，会话 token 走 `Authorization: Bearer` 存在 `localStorage`，不用 cookie；OAuth 回调用 URL fragment 传 token，读到后立刻清掉地址栏。
- 管理员由 `worker/wrangler.toml` 的 `ADMIN_GITHUB_LOGINS` 决定；`ALLOWED_ORIGINS` 同时用于 CORS 和登录后的跳转白名单，加自定义域名时它要和 `SITE_URL` 一起改。

首次部署：

```bash
bun x wrangler d1 create asdukw-comments      # 把 database_id 填进 worker/wrangler.toml
bun x wrangler d1 execute asdukw-comments --remote --file worker/schema.sql
bun x wrangler secret put GH_CLIENT_SECRET --config worker/wrangler.toml
bun run deploy:api
```

GitHub OAuth App 的 callback 必须指向 `https://<worker>.workers.dev/api/auth/callback`。D1 表结构变更不在 workflow 里自动执行，需要手动跑 `schema.sql`（全部 `create ... if not exists`，可重复执行；改已有表时另写 `alter table`）。

## 部署

GitHub Actions 的 [`deploy.yml`](.github/workflows/deploy.yml) 在 `master` 上按前端 / Worker 路径变化触发，也可手动触发：

- **deploy-pages**：`build:content` → 校验生成文件无漂移 → `typecheck` → `typecheck:worker` → `lint` → `smoke` → `build` → `wrangler pages deploy`
- **deploy-worker**：`wrangler deploy --config worker/wrangler.toml`

需要的 GitHub secrets：`BUN_PUBLIC_API_BASE`、`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`。token 至少要有 **Cloudflare Pages: Edit**、**Workers Scripts: Edit**、**D1: Edit** 三个权限。

本地手动部署 `bun run deploy:pages` 会把 `.env` 里的 `BUN_PUBLIC_API_BASE` 打进包里，正式发布走 CI（真实环境变量优先于 `.env`）。

## 更多

标了 ⚠️ 的那种坑都在 [AGENTS.md](AGENTS.md)：为什么构建必须带 `--public-path=/`、为什么不能生成 `dist/404.html`、两个 `index.html`、两个 lockfile、favicon 怎么来的等。
