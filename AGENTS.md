# AGENTS.md

## Runtime

Bun（不是 Node.js）+ React 19 静态站。文章是仓库里的 MDX，构建期预渲染，运行时没有数据库；评论和 GitHub 登录在 `worker/` 的独立 Cloudflare Worker + D1，没有 API 时站点照常显示。没有 test runner 和 formatter。

## 验证

提交前按 CI 顺序跑：

```bash
bun run build:content && bun run typecheck && bun run typecheck:worker && bun run lint && bun run smoke && bun run build
```

`src/generated/posts.ts` 与 `src/styles.css` 是自动生成但必须提交的文件；CI 会检查 `posts.ts` 是否有未提交的漂移。

## 代码地图

- `src/index.html` 是真正的 app shell；根目录 `index.html` 是过时占位。
- 页面只通过 `src/lib/posts.ts` 取文章，不直接 import `@/generated/posts`。
- `@/*` → `./src/*`；`worker/` 有独立 `tsconfig.json`，两边类型检查分开跑。
- `BUN_PUBLIC_*` 会进浏览器产物，只放公开值；GitHub client secret 只在 Worker secret。

## 细节文档

| 任务 | 文档 |
| --- | --- |
| 写/改文章、frontmatter、TOC、删文章 | `docs/CONTENT.md` |
| 评论、登录、Worker 端点、D1 schema | `docs/COMMENT-API.md` |
| 构建、部署、CI、SPA fallback、域名 | `docs/DEPLOYMENT.md` |
| 样式、主题、暗色模式、正文排版 | `docs/STYLING.md` |
| 文件职责、数据流、i18n、图标 | `docs/ARCHITECTURE.md` |
| 添加 shadcn 组件 | `docs/COMPONENTS.md` |
