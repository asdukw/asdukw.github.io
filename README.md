# asdukw · 随笔与技术博客

基于 Bun + React + shadcn/ui 的个人网站，中英双语，Cloudflare Pages 静态部署（`https://asdukw.pages.dev`）。

## 技术栈

- **Bun** — 运行时与打包器
- **React 19 + react-router** — 前端框架与路由（BrowserRouter，干净 URL）
- **Tailwind CSS v4 + shadcn/ui** — 样式与 UI 组件
- **MDX** — 文章内容（`@mdx-js/mdx` 构建时编译为静态 HTML）

## 常用命令

```bash
bun install                 # 安装依赖
bun dev                     # 开发服务器（HMR）
bun run build:content       # 新增/修改文章后重新编译内容
bun run css                 # 编译 Tailwind CSS（dev/build 会自动执行）
bun run build               # 生产构建 → dist/
bun start                   # 仅启动 Bun 服务器
```

## 文章怎么加

1. 在 `src/content/<category>/` 下新建 `<slug>.<lang>.mdx`（category ∈ `blog|tech`，lang ∈ `zh|en`）
2. frontmatter 包含 `title`、`date`、`tags`、`excerpt`
3. 本地跑 `bun run build:content` 生成 `src/generated/content.ts` 并提交

## 部署

Pages 和 OAuth Worker 由两个独立的 GitHub Actions workflow 部署：

- 修改 `src/`、构建脚本或根目录依赖时，`deploy.yml` 构建并部署 Cloudflare Pages
- 修改 `worker/` 时，`deploy-worker.yml` 类型检查并部署 Cloudflare Worker
- 两个 workflow 都支持在 GitHub Actions 页面手动触发

本地手动部署：`bun run deploy:pages` 或 `bun run deploy:worker`。

本地 Wrangler 配置放在根目录 `.env` 中（可参考 `.env.example`）：

```dotenv
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
```

API Token 只由 Wrangler 在本地读取，不会被打包到前端；`.env` 已加入 `.gitignore`，不要提交真实 Token。
