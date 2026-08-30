# AGENTS.md

## Runtime

Bun, not Node.js. All commands use `bun`.

## Commands

- `bun install` — install dependencies
- `bun dev` — dev server with HMR (`bun --hot src/index.ts`)
- `bun build ./src/index.html --outdir=dist` — production build (browser target)
- `bun start` — production server (`NODE_ENV=production`)

No test runner, linter, or formatter is configured.

## Architecture

- `src/index.ts` — Bun HTTP server with route definitions (add API endpoints here)
- `src/index.html` — HTML shell, loads `frontend.tsx`
- `src/frontend.tsx` — React client entry, mounts `<App />` into `#root`
- `src/App.tsx` — root React component
- Static file serving configured via `bunfig.toml` (`BUN_PUBLIC_*` env)

## TypeScript

- Strict mode enabled, `noUncheckedIndexedAccess: true`
- Path alias: `@/*` → `./src/*`
- JSX: `react-jsx`
- Module resolution: `bundler` mode (allows `.ts` extension imports)

## Frontend (shadcn/ui)

- UI 组件库：shadcn/ui（New York 风格，Neutral 配色）
- 组件目录：`src/components/ui/`，工具函数：`src/lib/utils.ts`（`cn()` 辅助）
- 添加组件：`npx shadcn@latest add <component-name>`
- Tailwind CSS v4，CSS 变量主题在 `src/index.css` 中定义
- PostCSS 配置：`postcss.config.mjs`

## Gotchas

- Server routes are defined inline in `src/index.ts` — no separate router file
- Env vars prefixed `BUN_PUBLIC_` are exposed to client via `--env` flag
- HMR uses `import.meta.hot.data` pattern in `frontend.tsx`
- npm/bun 安装遇到网络问题时，使用代理端口 7897：
  ```powershell
  $env:HTTP_PROXY='http://127.0.0.1:7897'; $env:HTTPS_PROXY='http://127.0.0.1:7897'; npm install ...
  ```
