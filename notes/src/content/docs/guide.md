---
title: 写作指南
description: 如何新增系列、章、讲，以及构建与部署约定。
---

这个站用 [Starlight](https://starlight.astro.build/)（Astro 的文档主题）搭建，所有内容都是 `src/content/docs/` 下的 Markdown / MDX。

## 目录约定

```
src/content/docs/
├── index.mdx          # 首页（splash）
├── guide.md           # 本页
├── 404.md             # 自定义 404
└── notes/             # 所有笔记都放这里
    ├── index.md       # 「笔记总览」入口
    └── <系列>/        # 例：redis
        ├── index.md   # 系列概览
        └── <章>/      # 例：chapter-01
            ├── index.md   # 章概览（可选）
            └── lec-01.md  # 一讲
```

- 文件夹名用英文小写 + 连字符，决定 URL：`notes/redis/chapter-01/lec-01.md`
  → `/notes/redis/chapter-01/lec-01/`。
- 左侧目录由 `astro.config.mjs` 里的 `autogenerate: { directory: 'notes' }` 按目录层级自动生成
  （系列 → 章 → 讲），**新增内容不用改配置**。

## 控制顺序和侧栏标题

- **讲 / 章的顺序**：在 frontmatter 里加 `sidebar.order`，数字小的在前。默认按文件名排序。

  ```md
  ---
  title: 第 2 讲 · 持久化
  sidebar:
    order: 2
  ---
  ```

- **系列分组标题**：默认显示系列文件夹名（如 `redis`）。想显示中文标题，在
  `astro.config.mjs` 的 `sidebar` 里给这个系列单独写一组：

  ```js
  sidebar: [
    { label: '笔记总览', slug: 'notes' },
    { label: 'Redis 笔记', items: [{ autogenerate: { directory: 'notes/redis' } }] },
    { label: '写作指南', slug: 'guide' },
  ],
  ```

## Frontmatter 示例

```md
---
title: 第 1 讲 · 概览
description: 这一讲的一句话摘要，会用于搜索和分享卡片。
---
```

## 常用能力

- 代码高亮、表格、任务列表等 Markdown 能力开箱即用。
- 提示块用 `:::note` / `:::tip` / `:::caution` / `:::danger`（注意是三个冒号）。
- 图片放 `src/assets/`（相对引用，构建期优化）或 `public/`（原样复制，根路径 `/` 引用）。
- 数学公式、Mermaid 等需要额外插件，用时再装。

## 本地开发与构建

```bash
cd notes
bun install
bun run dev      # 本地开发，默认 http://localhost:4321
bun run build    # 产出静态站点到 notes/dist
bun run preview  # 预览构建结果
```

## 部署

独立 Cloudflare Pages 项目 `asdukw-notes`，由仓库根目录 `.github/workflows/deploy-notes.yml` 部署。
首次部署前需先在 Cloudflare 创建该 Pages 项目（见 workflow 顶部注释）。
