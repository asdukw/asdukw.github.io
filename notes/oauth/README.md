# notes-decap-oauth

给 notes 文档站的 Decap CMS 提供 GitHub OAuth 登录的 Cloudflare Worker。

Decap 的 `github` 后端没有服务端就没法完成 OAuth，所以需要这个小 worker：
它把 `/auth` 跳到 GitHub 授权页，`/callback` 用 code 换 token 再回传给 Decap 弹窗。

## 一次性配置步骤

> 这些要用你自己的 GitHub / Cloudflare 账号操作，代码已就绪。

### 1. 创建 GitHub OAuth App

打开 <https://github.com/settings/applications/new>：

- **Application name**：随意，如 `asdukw notes decap`
- **Homepage URL**：`https://asdukw-notes.pages.dev`
- **Authorization callback URL**：`https://<你的-worker-域名>/callback?provider=github`

> 回调地址要等第 2 步部署完拿到 worker 域名后再回来填（GitHub 允许先建、后改）。

记下 **Client ID** 和 **Client Secret**。

### 2. 部署 worker

在本目录（`notes/oauth/`）执行：

```bash
npx wrangler deploy
```

部署成功会打印形如 `https://notes-decap-oauth.<你的子域>.workers.dev` 的地址。
把这个域名回填到 GitHub OAuth App 的 callback（第 1 步）。

### 3. 设置 secrets

```bash
npx wrangler secret put GITHUB_OAUTH_ID       # 粘贴 Client ID
npx wrangler secret put GITHUB_OAUTH_SECRET   # 粘贴 Client Secret
```

（`ADMIN_LOGIN` 已在 `wrangler.toml` 的 `[vars]` 里，默认 `asdukw`。）

### 4. 让 Decap 指向这个 worker

编辑 `notes/public/admin/config.yml`：

```yaml
backend:
  base_url: https://notes-decap-oauth.<你的子域>.workers.dev   # 换成实际地址，无末尾斜杠
```

然后提交并推送（会触发 notes 站重新部署），打开
`https://asdukw-notes.pages.dev/admin/`，用 GitHub 登录即可编辑。

## 安全说明

- 只有 GitHub 仓库有写权限、且 `ADMIN_LOGIN` 匹配的账号能真正提交；worker 还会在回调时再校验一次登录名。
- 若仓库改成私有，把 `src/index.js` 里的 `scope` 由 `public_repo,user` 改成 `repo,user`。
- 本 worker 只负责换取 token，不存 token、无数据库。
