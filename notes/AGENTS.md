# notes/ — 文档站（Starlight + Astro）

## 运行环境

Bun + Astro + Starlight。命令都在 `notes/` 目录下跑，不要用根目录的脚本。

```bash
bun install
bun run build      # 验收：必须能构建通过，产物在 notes/dist
bun run dev        # 本地开发，默认 http://localhost:4321
```

开发服务器用后台模式：`astro dev --background`，用 `astro dev stop/status/logs` 管理。

## 内容约定

- 内容都在 `src/content/docs/`，Markdown / MDX。
- 笔记按 `notes/<系列>/<章>/<讲>.md` 组织；目录层级 = 侧栏分组 = 章节结构。
- 侧栏是**显式配置**，不是纯自动：新增「系列」要在 `astro.config.mjs` 的 `sidebar` 里加一个顶层分组（`label` + 「概览」的 `slug` + 各章的 `autogenerate`）；新增「章」只在对应系列下加一条 `autogenerate`。
- 侧栏与翻页的系列隔离靠组件覆盖实现（`src/components/Sidebar.astro`、`src/components/Pagination.astro`，在 `astro.config.mjs` 的 `components` 注册）：一个顶层分组 = 一个系列，组内指向 `/notes/<系列>/` 的链接是该系列入口。新增系列不用改这两个组件。
- 文档站是中文-only；不要擅自加 i18n locale。
- 这里只放笔记正文，不要放主站博客相关内容。

## 与主站的关系

- 独立 Cloudflare Pages 项目 `asdukw-notes`，独立 workflow，独立依赖。
- 根仓库的 `tsconfig.json` / `eslint.config.js` 已把 `notes/**` 排除，两套构建互不干扰。

## 文档

- Starlight: https://starlight.astro.build
- Astro: https://docs.astro.build
