# asdukw · 随笔与技术博客

基于 Bun + React + shadcn/ui 的个人网站，中英双语，部署到 Cloudflare Pages（`https://asdukw.pages.dev`）。动态能力直接使用 Supabase，不需要自行维护 FastAPI、Bun API 或 OAuth Worker 服务。

## 技术栈

- **Bun** — 前端开发运行时与打包器
- **React 19 + react-router** — 前端框架与路由（BrowserRouter，干净 URL）
- **Tailwind CSS v4 + shadcn/ui** — 样式与 UI 组件
- **MDX** — 文章内容（构建时编译为静态 HTML）
- **Supabase Auth + Postgres + RLS** — GitHub 登录、用户资料、评论、点赞、收藏与阅读进度
- **Cloudflare Pages** — 静态站点托管与发布

## 本地开发

```powershell
Copy-Item .env.example .env
# 编辑 .env，填写 BUN_PUBLIC_SUPABASE_URL 和 BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY
bun install
bun dev
```

常用命令：

```bash
bun run build:content       # 新增/修改文章后重新编译内容
bun run css                 # 编译 Tailwind CSS（dev/build 会自动执行）
bun run build               # 生产构建 → dist/
bun start                   # 启动 Bun 静态服务器
bun x tsc --noEmit          # TypeScript 类型检查
```

前端只需要 Supabase 的 URL 和 publishable key。publishable key 会进入浏览器构建产物，因此数据库权限必须由 Supabase RLS 和 RPC 函数控制，不能把 `service_role` 或其他 secret key 放入这些变量。

## Supabase 初始化

1. 在 Supabase Dashboard 的 Authentication → Providers 中启用 GitHub，并把 GitHub OAuth App 的 callback URL 设置为 `https://<project-ref>.supabase.co/auth/v1/callback`。
2. 在 Supabase 的 URL Configuration 中把 `https://asdukw.pages.dev` 和本地开发地址加入 Site URL / Redirect URLs。
3. 在 Supabase SQL Editor 中执行 [`supabase/migrations/20260906120000_initial.sql`](supabase/migrations/20260906120000_initial.sql)。它会创建评论相关表、用户资料同步触发器、RLS 和前端调用的 RPC；使用 `if not exists`，不会主动删除已有数据。
4. 第一次 GitHub 登录后，在 SQL Editor 中将自己的资料设为管理员：

   ```sql
   update public.users
   set is_admin = true
   where auth_user_id = '你的 Supabase Auth user id';
   ```

如果以后使用 Supabase CLI 管理数据库，可将同一文件纳入 CLI 的 migration 流程；当前仓库不再使用 Alembic 或 Python 数据库服务。

## 文章怎么加

1. 在 `src/content/<category>/` 下新建 `<slug>.<lang>.mdx`（category ∈ `blog|tech`，lang ∈ `zh|en`）。
2. frontmatter 包含 `title`、`date`、`tags`、`excerpt`。
3. 本地运行 `bun run build:content`，提交生成的 `src/generated/content.ts`。

## 部署

GitHub Actions 的 [`deploy.yml`](.github/workflows/deploy.yml) 负责构建并发布 Cloudflare Pages。需要配置以下 GitHub Actions secrets：

```text
BUN_PUBLIC_SUPABASE_URL
BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

本地手动部署：`bun run deploy:pages`。Cloudflare token 只由 Wrangler 读取，不会被打包进前端；本地真实值放在 `.env`，不要提交。

数据库迁移和 GitHub Auth provider 配置属于 Supabase 项目设置，不会随 Cloudflare Pages 发布自动执行。修改 `supabase/migrations/` 后，需要在 Supabase SQL Editor 或已配置的 Supabase CLI 流程中应用并验证。

## 动态功能的边界

- GitHub 只作为 Supabase Auth 的身份提供方，浏览器通过 `@supabase/supabase-js` 完成登录和会话持久化。
- 评论区通过 `get_comments`、`add_comment`、`set_comment_reaction` 等 Supabase RPC 访问数据库，不再请求 `/api/comments/...`。
- 用户只能通过已授权的 RPC 写入评论、点赞、收藏和阅读进度；RLS 负责阻止浏览器直接读写受保护的表。
- 生产站点是静态前端，仓库中不再包含 `backend/`、FastAPI、SQLAlchemy、Alembic 或 OAuth Worker。
