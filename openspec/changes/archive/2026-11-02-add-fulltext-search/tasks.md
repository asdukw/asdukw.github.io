# Tasks

## 1. 分词

- [x] 1.1 新增 `src/lib/tokenize.ts`，导出 `tokenize(text: string): string[]`：CJK 连续片段切成相邻双字（长度 1 时取单字），拉丁/数字/`._-` 连续片段小写化为整词。用 `bun -e` 断言三条：`课件` 的切分结果含 `课件`；`due.md 每 2 天` 含 `due.md` 与 `2`；拉丁片段大小写不敏感。
- [x] 1.2 在 `scripts/ssr-smoke.tsx` 里加一段分词断言（中文连续串、中英混排、纯拉丁三种输入），跑 `bun run smoke` 确认失败前先看到断言失败、修好后通过。

## 2. 构建期段落数据

- [x] 2.1 新增 `scripts/search-index.ts`：给定 `CompiledPost`（`html` + `toc` + `lang` + `id`），按 h2/h3 切段、剥 HTML 标签、保留代码块文本，产出 `{ postId, lang, anchor?, heading, text }[]`；首个标题之前的内容 `anchor` 为 `undefined`。验证：对 `src/content/bb-sync.zh.mdx` 跑一次，段落数等于 `toc.length + 1`，且每段 `text` 非空、不含 `<`。
- [x] 2.2 在 `scripts/build-content.ts` 里调用 2.1，产出新生成物 `src/generated/search.ts`（含 `GeneratedSection` 类型与 `SECTIONS` 常量，注释标明 AUTO-GENERATED）。验证：`bun run build:content` 后文件存在，段落总数等于三篇文章的 `toc` 条目数之和加 3。
- [x] 2.3 在 `.github/workflows/deploy.yml` 里为 `src/generated/search.ts` 增加第三条 `git diff --exit-code` 检查。验证：本地改一处 MDX 但只重新生成 `posts.ts`，模拟 CI 的 `git diff --exit-code src/generated/search.ts` 返回非零。
- [x] 2.4 在 `docs/ARCHITECTURE.md` 的数据流里补一条 `build-content.ts → generated/search.ts → lib/search.ts` 支线，并在「约定」里写明新增生成物必须提交。逐条对照文中出现的新文件名与仓库实际路径。

## 3. 检索与聚合

- [x] 3.1 新增 `src/lib/search.ts`：用 `SECTIONS` + 文章元信息（`getPosts(lang)` 选出的那批）建 MiniSearch 索引，`tokenize` 用 1.1 的实现，字段权重 `heading` 高于 `text`；`q` 为空或全空白时直接返回 `undefined`，不建索引。验证：`bun -e` 中对 `q="课件"` 返回非空、`q="  "` 返回 `undefined`。
- [x] 3.2 在同一模块加结果聚合：按 `postId` 合并命中段落、取最高分段、生成片段（命中词前后定长窗口 + 省略号），返回 `{ post, snippet, anchor? }[]`。验证：`bun -e` 断言同一篇文章命中多个段落时结果只有一条，且 `snippet` 包含查询词。
- [x] 3.3 在 `scripts/ssr-smoke.tsx` 补搜索集成断言：`课件` 能命中 `id=2` 的文章、`/en` 语境下同一篇文章只出现一次、不存在的词返回空数组。跑 `bun run smoke` 通过。
- [x] 3.4 确认 `minisearch` 能被 `bun run typecheck` 正常解析（`package.json` 增加依赖并 `bun install` 后跑一次）；若 3.1 用了动态 `import("minisearch")`，`bun run build` 后检查 `dist/` 是否出现独立 chunk，把结论写进 `design.md` 决策 5。

## 4. 列表页接入

- [x] 4.1 把 `src/components/blog/PostList.tsx` 的 `?q=` 过滤从字段匹配换成 3.2 的搜索调用，`?tag=` 与搜索继续叠加，空查询走原列表路径。验证：`bun run smoke` 通过，`/post?q=课件` 与 `/post?tag=工具&q=课件` 在 `bun dev` 下分别显示预期结果。
- [x] 4.2 在 `src/components/blog/PostRow.tsx` 显示命中片段（有关键词时才渲染），片段样式与现有摘要区分开。验证：`bun dev` 下 `/post?q=课件` 每行都显示含关键词的片段，无查询时不渲染片段。
- [x] 4.3 在 `src/i18n/dictionaries.ts` 补齐新文案（无结果、片段省略等），中英各一份并满足 `Dict` 接口约束。验证：`bun run typecheck` 通过；`/post?q=zzzz` 与 `/en/post?q=zzzz` 分别显示中文、英文空态文案。
- [x] 4.4 确认预渲染与 SEO 不受影响：跑 `bun run build`，检查 `dist/post.html` 里仍是全量文章列表（不含搜索态），且构建自检的 title/canonical 检查未报错。

## 5. 集成验证

- [x] 5.1 跑完整 CI 序列：`bun run build:content && bun run typecheck && bun run typecheck:worker && bun run lint && bun run smoke && bun run build`，全绿。
- [x] 5.2 手工验收四条内容：中文搜 `课件`、搜 `due.md`、`/en/post?q=download` 只出英文版本、清空 `q` 回到完整列表；同时记录 `dist/index-*.js` 的体积变化并与 202 KB gzip 基线对比。

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
