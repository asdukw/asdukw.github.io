# 评论 API（Cloudflare Worker + D1）

`worker/` 是独立部署的 Cloudflare Worker：`src/index.ts`（路由）、`src/auth.ts`（GitHub OAuth）、`src/session.ts`（会话）、`src/comments.ts`（评论查询）、`src/http.ts`（CORS/cookie/JSON）、`schema.sql`（D1 表结构）、`wrangler.toml`（`name = "asdukw-api"`）。

## 认证模型

- Worker 与前端**不同源**（`workers.dev` vs `asdukw.pages.dev`），所以会话 token 走 `Authorization: Bearer`，存在 `localStorage["site.session"]`，不用 cookie——跨站 cookie 在多个浏览器里默认被拦截。
- OAuth 回调用 URL fragment 传 token（`#token=...`），不会进入服务端日志或 Referer；`consumeSessionToken()` 读取后立刻用 `history.replaceState` 清掉地址栏。
- 会话只存 SHA-256 哈希，30 天过期；过期记录在下次登录时顺带清理。
- 管理员由 `ADMIN_GITHUB_LOGINS`（逗号分隔的 GitHub login）决定，登录时写入 `users.is_admin`。GitHub login 可以改名，改名后要同步更新这个变量。

## 配置（`worker/wrangler.toml`）

- `SITE_URL`：站点地址。
- `ALLOWED_ORIGINS`：同时用于 CORS 和登录后的跳转白名单（防开放重定向）。加自定义域名时要同时改它和 `SITE_URL`。
- `GH_CLIENT_ID`：公开，随浏览器跳转发给 GitHub；`GH_CLIENT_SECRET` 只能走 `wrangler secret put`。
- `ADMIN_GITHUB_LOGINS`：管理员 login 列表。

## 端点

- `GET /api/auth/login`、`GET /api/auth/callback`、`GET /api/auth/user`、`POST /api/auth/logout`
- `GET|POST /api/comments`
- `POST /api/comments/:id/like`
- `POST /api/comments/:id/status`（管理员隐藏评论）
- `GET /api/health`

错误统一返回 `{ error: "code" }`；前端把网络失败映射成 503 `comments_unavailable`，评论区显示"暂时不可用"而不是报错。

## 本地开发

```bash
bun run dev:api   # wrangler dev --config worker/wrangler.toml，默认 http://localhost:8787
```

`bun dev` 在非 production 下默认连 `http://localhost:8787`；`.env` 里的 `BUN_PUBLIC_API_BASE` 可覆盖。`worker/` 用独立 tsconfig，类型检查跑 `bun run typecheck:worker`。

## 首次部署

```bash
bun x wrangler d1 create asdukw-comments          # 把 database_id 填进 worker/wrangler.toml
bun x wrangler d1 execute asdukw-comments --remote --file worker/schema.sql
bun x wrangler secret put GH_CLIENT_SECRET --config worker/wrangler.toml
bun run deploy:api
```

- `d1 create` / `d1 execute --remote` / `secret put` 都需要 `CLOUDFLARE_API_TOKEN` 有 **D1: Edit** 和 **Workers Scripts: Edit** 权限，只有 Pages 权限会在第一步就失败。
- GitHub OAuth App 的 callback 必须指向 `https://<worker>.workers.dev/api/auth/callback`；改了 Worker 名字或域名要同步改。
- 正式部署走 CI（见 [DEPLOYMENT.md](DEPLOYMENT.md)）。

## D1 表结构变更

不在 workflow 中自动执行，需要手动跑：

```bash
bun x wrangler d1 execute asdukw-comments --remote --file worker/schema.sql
```

`schema.sql` 全部用 `create ... if not exists`，重复执行是安全的；**改已有表时不要直接改 `schema.sql` 里的定义**，要另写一段 `alter table` 并手动执行。
