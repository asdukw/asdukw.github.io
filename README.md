# asdukw · 随笔与技术博客

基于 Bun + React + shadcn/ui 的个人网站，中英双语，Cloudflare Pages 静态部署（`https://asdukw.pages.dev`），动态后端使用 FastAPI + Supabase Postgres。

## 技术栈

- **Bun** — 运行时与打包器
- **React 19 + react-router** — 前端框架与路由（BrowserRouter，干净 URL）
- **Tailwind CSS v4 + shadcn/ui** — 样式与 UI 组件
- **MDX** — 文章内容（`@mdx-js/mdx` 构建时编译为静态 HTML）
- **FastAPI + SQLAlchemy + Alembic** — 动态 API、ORM 与可审计数据库迁移
- **Supabase Postgres** — 用户、会话、评论、点赞、收藏与阅读进度
- **GitHub OAuth** — 仅作为登录身份提供方，OAuth access token 不落库

## 常用命令

```bash
bun install                 # 安装依赖
bun dev                     # 开发服务器（HMR）
bun run build:content       # 新增/修改文章后重新编译内容
bun run css                 # 编译 Tailwind CSS（dev/build 会自动执行）
bun run build               # 生产构建 → dist/
bun start                   # 仅启动 Bun 服务器
```

后端命令在 `backend/` 目录执行：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
alembic upgrade head       # 将 schema 应用到 Supabase
uvicorn app.main:app --reload --port 8000
```

## 文章怎么加

1. 在 `src/content/<category>/` 下新建 `<slug>.<lang>.mdx`（category ∈ `blog|tech`，lang ∈ `zh|en`）
2. frontmatter 包含 `title`、`date`、`tags`、`excerpt`
3. 本地跑 `bun run build:content` 生成 `src/generated/content.ts` 并提交

## 部署

Pages、FastAPI 检查和旧 Worker 由独立的 GitHub Actions workflow 管理：

- 修改 `src/`、构建脚本或根目录依赖时，`deploy.yml` 构建并部署 Cloudflare Pages
- 修改 `backend/` 时，`backend.yml` 安装依赖并执行 Python 编译/import 检查
- `worker/` 和 `src/server/` 的 workflow 暂时保留，作为迁移期间的回滚路径；生产前端应通过 `BUN_PUBLIC_API_URL` 指向 FastAPI
- 所有 workflow 都支持在 GitHub Actions 页面手动触发

本地手动部署 Pages：`bun run deploy:pages`。FastAPI 需要部署到支持 Python 的容器或 Web 服务平台，启动命令为：

```text
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

部署后，将 GitHub Actions secret `BUN_PUBLIC_API_URL` 设置为 FastAPI 的公开 HTTPS 地址。FastAPI 服务需要设置 `backend/.env.example` 中的 Supabase、GitHub OAuth、CORS 和 Cookie 变量。

本地 Wrangler 配置放在根目录 `.env` 中（可参考 `.env.example`）：

```dotenv
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
```

API Token 只由 Wrangler 在本地读取，不会被打包到前端；`.env` 已加入 `.gitignore`，不要提交真实 Token。

评论区现在由 FastAPI 写入 Supabase Postgres，接口路径保持为 `/api/discussions/{category}/{slug}`，以便前端平滑切换。首次评论或收藏一篇文章时，后端会按 `category/slug` 创建文章索引。GitHub OAuth 只请求 `read:user`，登录后的会话以哈希形式存储在 `auth_sessions` 中。

数据库模型在 `backend/app/models.py`，初始迁移在 `backend/alembic/versions/20260905_0001_initial.py`。修改模型后先审查 `alembic revision --autogenerate` 生成的 migration，再执行 `alembic upgrade head`。
