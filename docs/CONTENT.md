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
image: "/images/og-1.png"   # 可选，分享卡片用图
---
```

- 公开地址用 `id`：`/post/1`。id 一旦发布就不要再改，否则评论会和文章对不上。
- `image` 可选，只影响分享卡片（`og:image`）：必须是根绝对路径（`public/` 下的文件），不写就用站点默认的 `/og.png`。
- `date` 格式 `YYYY-MM-DD`。
- **英文版本可选**：站点默认只有中文正文，`en` 只作为界面语言。文章列表按 `id` 去重，优先界面语言、缺英文正文时回退中文原文；没有 `en` 版本时 en 界面照样能看，不会出现空列表或 404。想给某篇补英文再按同一 `id` 加一份 `<name>.en.mdx`。

## 加 / 改文章流程

1. 写或改 `src/content/<name>.<lang>.mdx`
2. `bun run build:content`
3. 把 `src/generated/posts.ts` 一起提交

CI 会跑 `git diff --exit-code src/generated/posts.ts`，生成文件和 MDX 不同步会直接失败。

## 正文规则

- 支持 Markdown + GFM（表格、删除线、任务列表）。
- **不支持自定义 JSX 组件**：站点渲染的是静态 HTML，没有东西可以 hydrate。
- **图片**放 `public/images/<name>.png`，正文用根绝对路径引用：`![说明](/images/<name>.png)`。`public/` 由 `scripts/copy-assets.ts` 原样复制进 `dist/`（Bun 的 bundler 只处理 import 进来的资源，Markdown 里写的 `<img src>` 不走它），开发服务器在 `src/index.ts` 里为 `/images/*` 单开了静态路由。
- 目录（TOC）只收集 h2/h3，由 `scripts/mdx.ts` 在 rehype-slug 之后抽取。
- 文章顺序由 `scripts/build-content.ts` 统一排序（日期倒序，其次 id 倒序），不要依赖文件名顺序。

## 提示块（callout）

用 GitHub Alerts 的写法，把一个引用块声明成提示块：

```markdown
> [!WARNING]
> 课程资料版权归学校和各位老师所有，请只用于自己学习。
```

- 支持五种：`NOTE`、`TIP`、`IMPORTANT`、`WARNING`、`CAUTION`，大小写不敏感。
- **标记必须独占一行**：`> [!NOTE] 备注`（同行跟文字）不会被识别，就渲染成普通引用块。
- 标题语言跟随正文语言（frontmatter 的 `lang`），不跟界面语言：中文正文的 `NOTE` 是「注意」，英文正文是 “Note”。
- 类型拼错（如 `[!WARNNG]`）不会报错，也不会吞内容：整块按普通引用块渲染，你能在页面上看到原文的标记。
- 内容支持多段、列表、代码、链接——只要每行都以 `>` 开头。

转换在构建期由 `scripts/remark-callout.ts` 完成，产物是静态 HTML（`div.callout`），没有客户端脚本参与。颜色与样式约定见 [STYLING.md](STYLING.md#提示块callout)。

## 删文章

只删 MDX 不会删评论，评论会留在 D1 里变成孤儿。需要手动清理：

```sql
delete from comments where post_id = N;
```

（见 `worker/schema.sql` 顶部注释。）
