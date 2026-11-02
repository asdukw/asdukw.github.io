# 写文章（仓库里的 MDX）

文章的权威来源是 `src/content/*.mdx`，没有数据库。前端也不编译 MDX：HTML 在构建期由 `scripts/mdx.ts` 预渲染，浏览器不打包 `@mdx-js/mdx`。

## Frontmatter

文件名是 `<name>.<lang>.mdx`，同一篇文章的中英文版本共用同一个 `id`：

```yaml
---
id: 1
lang: zh          # zh | en
title: "标题"
date: "2026-08-28"
tags: ["Bun", "React"]
excerpt: "摘要"
---
```

- 公开地址用 `id`：`/post/1`。id 一旦发布就不要再改，否则评论会和文章对不上。
- `date` 格式 `YYYY-MM-DD`。

## 加 / 改文章流程

1. 写或改 `src/content/<name>.<lang>.mdx`
2. `bun run build:content`
3. 把 `src/generated/posts.ts` 一起提交

CI 会跑 `git diff --exit-code src/generated/posts.ts`，生成文件和 MDX 不同步会直接失败。

## 正文规则

- 支持 Markdown + GFM（表格、删除线、任务列表）。
- **不支持自定义 JSX 组件**：站点渲染的是静态 HTML，没有东西可以 hydrate。
- 目录（TOC）只收集 h2/h3，由 `scripts/mdx.ts` 在 rehype-slug 之后抽取。
- 文章顺序由 `scripts/build-content.ts` 统一排序（日期倒序，其次 id 倒序），不要依赖文件名顺序。

## 删文章

只删 MDX 不会删评论，评论会留在 D1 里变成孤儿。需要手动清理：

```sql
delete from comments where post_id = N;
```

（见 `worker/schema.sql` 顶部注释。）
