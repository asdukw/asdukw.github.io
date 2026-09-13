# asdukw · 随笔与技术博客

基于 Bun + React + shadcn/ui 的个人网站，中英双语，部署到 Cloudflare Pages（`https://asdukw.pages.dev`）。动态能力直接使用 Supabase，不需要自行维护 FastAPI、Bun API 或 OAuth Worker 服务。

## 技术栈

- **Bun** — 前端开发运行时与打包器
- **React 19 + react-router** — 前端框架与路由（BrowserRouter，干净 URL）
- **Tailwind CSS v4 + shadcn/ui** — 样式与 UI 组件
- **Supabase Postgres** — 文章内容和互动数据，浏览器运行时读取
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
bun run css                 # 编译 Tailwind CSS（dev/build 会自动执行）
bun run build               # 生产构建 → dist/
bun start                   # 启动 Bun 静态服务器
bun x tsc --noEmit          # TypeScript 类型检查
```

前端只需要 Supabase 的 URL 和 publishable key。publishable key 会进入浏览器构建产物，因此数据库权限必须由 Supabase RLS 和 RPC 函数控制，不能把 `service_role` 或其他 secret key 放入这些变量。

## Supabase 初始化

1. 在 Supabase Dashboard 的 Authentication → Providers 中启用 GitHub，并把 GitHub OAuth App 的 callback URL 设置为 `https://<project-ref>.supabase.co/auth/v1/callback`。
2. 在 Supabase 的 URL Configuration 中把 `https://asdukw.pages.dev` 和本地开发地址加入 Site URL / Redirect URLs。
3. 登录并关联本地 Supabase 项目：

   ```powershell
   bun x supabase login
   bun x supabase link --project-ref <project-ref>
   ```

4. 先预览、再执行仓库中的全部 migration：

   ```powershell
   bun x supabase db push --dry-run
   bun x supabase db push
   ```

   初始 migration 创建用户、评论和互动相关表；文章 migration 会把仓库原有 MDX 的中英文内容写入 `public.posts` 和 `public.post_translations`。如果已经在 SQL Editor 手动执行过同一份 SQL，不要直接重复推送，先核对 migration history。

5. 第一次 GitHub 登录后，在 SQL Editor 中将自己的资料设为管理员：

   ```sql
   update public.users
   set is_admin = true
   where auth_user_id = '你的 Supabase Auth user id';
   ```

仓库使用 Supabase CLI 管理数据库 migration；当前不再使用 Alembic 或 Python 数据库服务。

## 文章怎么管理

文章存储在 Supabase：`public.posts` 保存文章身份和发布状态，`public.posts_i18n` 保存 `zh` / `en` 两个版本的标题、摘要、标签、原始 MDX、HTML 和目录。前端公开读取已发布文章，文章写入通过受限 RPC 完成。

目前项目还没有独立的文章管理页面。新增或修改文章时，应使用受管理员权限保护的 RPC/SQL 流程，不要重新添加 `src/content/*.mdx` 文件；数据库结构变化必须新增 `supabase/migrations/` 文件。

## 部署

GitHub Actions 的 [`deploy.yml`](.github/workflows/deploy.yml) 负责构建并发布 Cloudflare Pages。需要配置以下 GitHub Actions secrets：

```text
BUN_PUBLIC_SUPABASE_URL
BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

本地手动部署：`bun run deploy:pages`。Cloudflare token 只由 Wrangler 读取，不会被打包进前端；本地真实值放在 `.env`，不要提交。

GitHub Auth provider 配置属于 Supabase 项目设置，不会随 Cloudflare Pages 发布自动执行。修改 `supabase/migrations/` 后，需要通过已关联的 Supabase CLI 流程执行并验证；Pages workflow 不会自动修改数据库。

## 动态功能的边界

- GitHub 只作为 Supabase Auth 的身份提供方，浏览器通过 `@supabase/supabase-js` 完成登录和会话持久化。
- 评论区通过 Supabase RPC 访问数据库；点赞使用 `set_comment_like`，评论支持 `parent_id` 树形回复。
- 用户只能通过已授权的 RPC 写入评论、点赞、收藏和阅读进度；RLS 负责阻止浏览器直接读写受保护的表。
- 生产站点是静态前端，仓库中不再包含 `backend/`、FastAPI、SQLAlchemy、Alembic 或 OAuth Worker。
