# 构建与部署

生产站点：`https://asdukw.pages.dev`（Cloudflare Pages 项目 `asdukw`，direct upload）；评论 Worker（`asdukw-api`）独立部署。

## CI/CD

GitHub Actions 只有 `.github/workflows/deploy.yml`：在 `master` 上按前端 / Worker 路径变化触发，也支持手动触发。两个 job：

- `deploy-pages`：`build:content` → 检查 `src/generated/posts.ts` 没有未提交的漂移（`git diff --exit-code`）→ `typecheck` → `typecheck:worker` → `lint` → `smoke` → `build` → `wrangler pages deploy`
- `deploy-worker`：`wrangler deploy --config worker/wrangler.toml`（Worker 只在 `worker/**` 等路径变化时才有实际改动，但两个 job 都会跑）

两个 job 都用 `oven-sh/setup-bun@v2` 和 `bun install --frozen-lockfile`。

需要 GitHub secrets：`BUN_PUBLIC_API_BASE`、`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`。

`CLOUDFLARE_API_TOKEN` 需要三个权限：Account → **Cloudflare Pages: Edit**（部署前端）、**Workers Scripts: Edit**（部署 Worker）、**D1: Edit**（执行 `d1 execute --remote`）。只给 Pages 权限时 `wrangler d1 execute --remote` 会报 `Authentication error [code: 10000]`。本地 Wrangler 从根目录 `.env` 读取 token 和 account id，不要把 token 写入仓库配置。

## 构建参数

- **构建必须带 `--public-path=/`**。`bun build` 默认把 `index.html` 里的资源写成相对路径（`./index-xxx.js`），在 `/post/1` 这种深层链接上刷新时浏览器会解析成 `/post/index-xxx.js`；该路径没有静态文件，Pages 的 SPA fallback 就把 `index.html` 当 JS 返回（200 + `text/html`），浏览器报 `SyntaxError`、应用白屏。删掉这个参数会让所有深层链接的刷新挂掉。
- 构建顺序（`package.json` 的 `build`）：`build:content` → Tailwind CLI 编译 CSS → `fetch-icon.ts`（抓 GitHub 头像到 `src/icon.png`）→ `bun build` → `copy-404.ts`。

## SPA fallback

路由用 `BrowserRouter`（干净 URL，无 `#`）。`scripts/copy-404.ts` 生成 `dist/_redirects`（`/* /index.html 200`）做 SPA fallback，深层链接/刷新按当前 pathname 渲染对应页面。

**不要**生成 `dist/404.html`——Cloudflare Pages 只有在没有顶层 `404.html` 时才启用原生 SPA 渲染。

## 环境变量

- 前缀 `BUN_PUBLIC_` 的值会通过构建参数暴露给浏览器；只能放公开信息（目前只有 `BUN_PUBLIC_API_BASE`），GitHub client secret 只能放在 Worker secret 里。
- 本地 `.env` 里的 `BUN_PUBLIC_API_BASE=http://localhost:8787` 是给 `bun dev` + `bun run dev:api` 用的。本地直接跑 `bun run deploy:pages` 会把这个地址打进包里，正式部署要走 CI（真实环境变量优先于 `.env`，CI 的 secret 会覆盖它）。
- 文章是纯静态的：没有 API 也要能正常显示。`src/lib/api.ts` 在缺少 `BUN_PUBLIC_API_BASE` 时不会抛错，只让评论区显示不可用。

## 部署命令

- `bun run deploy:pages` — 本地构建并用 Wrangler 部署 Cloudflare Pages（注意上面的 `.env` 陷阱）
- `bun run deploy:api` — 用 Wrangler 部署评论 Worker
