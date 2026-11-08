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
- 笔记总览页（`src/content/docs/notes/index.mdx`）用 `template: splash` + `LinkCard` 列出各系列：总览页不放侧栏，也不放维护者用的目录约定（那些只写在这里和 `README.md`）。
- 侧栏是**显式配置**，不是纯自动：新增「系列」要在 `astro.config.mjs` 的 `sidebar` 里加一个顶层分组（`label` + 「概览」的 `slug` + 各章的 `autogenerate`）；新增「章」只在对应系列下加一条 `autogenerate`。
- 侧栏与翻页的系列隔离靠组件覆盖实现（`src/components/Sidebar.astro`、`src/components/Pagination.astro`，在 `astro.config.mjs` 的 `components` 注册）：一个顶层分组 = 一个系列，组内指向 `/notes/<系列>/` 的链接是该系列入口。新增系列不用改这两个组件。
- 文档站是中文-only；不要擅自加 i18n locale。
- 这里只放笔记正文，不要放主站博客相关内容。

## 写作规范（对齐 Cloudflare 文档风格）

参考 <https://developers.cloudflare.com/style-guide/>，取其中和笔记站相关的部分：

- **标题用名词**：`Redis 笔记`、`1.1 架构：五个角色与一条消息的一生`，不要写「XX 教程」「XX 文档」或「介绍」。
- **概述页（概览）不是目录**：先一段话说清「这是什么、从哪开始」，再列章节链接。链接超过 5 条用列表，别硬塞卡片。
- **概览页不放这些东西**：Steps、代码块、折叠块——概览只负责引导方向。
- **卡片文案 = 名字 + 一行**：一句话说清"这个系列解决什么问题"，不要在卡片里写段落。
- **语气**：直接、可验证，避免营销腔；能给出可复现的命令或现象就别只给结论。
- 系列首页（`notes/<系列>/index.md`）承担概览页职责，`sidebar.order` 决定系列在侧栏里的顺序。

## 与主站的关系

- 独立 Cloudflare Pages 项目 `asdukw-notes`，独立 workflow，独立依赖。
- 根仓库的 `tsconfig.json` / `eslint.config.js` 已把 `notes/**` 排除，两套构建互不干扰。

## 文档

- Starlight: https://starlight.astro.build
- Astro: https://docs.astro.build
