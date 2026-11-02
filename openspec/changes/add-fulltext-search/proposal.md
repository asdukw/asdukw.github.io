# Proposal

## Why

文章列表的搜索框（`/post?q=`）只匹配 `title`、`excerpt`、`tags` 三个字段，正文搜不到。三篇文章的正文纯文本合计约 4.8 K 字符、19 个 h2/h3 段落，读者记得住「Bun 打包参数」或「pip 脚本目录」这类词，但搜不出来——搜索框看起来在，实际等于只搜标题。

现在补这个缺口成本很低：正文 HTML 由 `scripts/build-content.ts` 在构建期一次性产出，浏览器侧不需要解析 Markdown；索引体量是噪音级（19 段）。拖下去只会让「搜索框不管用」变成习惯。

## What Changes

- **新增构建期搜索索引**：`scripts/build-content.ts` 在产出 `src/generated/posts.ts` 的同时，从同一份编译结果派生段落级纯文本（`postId` / `lang` / `anchor` / `heading` / `text`），写入新生成物 `src/generated/search.ts`。
- **新增中文可用的分词**：CJK 连续片段切成双字 bigram，拉丁/数字片段按词小写化。不依赖 `Intl.Segmenter`——实测本机 ICU 对中文只做到部分词级切分（`课件` → `课` | `件`），不能作为索引基础。
- **新增运行期检索**：`src/lib/search.ts` 用 MiniSearch 建倒排（标题权重高于正文），对外提供一个查询函数，返回按文章聚合的结果 + 每篇最高分段落的命中片段。
- **修改** `/post?q=` 的语义：从「匹配标题/摘要/标签」升级为「全文搜索」，结果仍然是文章级的 `PostRow`，在行内显示命中片段。URL 契约（`?q=`、`useSearchParams`、语言前缀）保持不变，旧链接继续可用，只是命中范围变宽。
- **新增** `minisearch` 依赖（约 18.8 KB gzip）。
- **新增** CI 对 `src/generated/search.ts` 的未提交漂移检查，与现有两个生成物同等对待。

不做的事：不引入搜索弹窗 / Ctrl+K 命令面板；不改路由、预渲染、i18n 前缀规则、评论、主题。

## Capabilities

### New Capabilities

- `content-search`: 站内正文检索——索引在构建期生成、查询在浏览器侧执行，命中粒度到文章段落，结果按界面语言呈现并遵守与文章列表相同的语言回退规则。

### Modified Capabilities

<!-- 无。`i18n-routing` 的 URL/前缀规则不变；`seo-artifacts` 不受影响。 -->

## Impact

- **代码**：`scripts/build-content.ts`、`scripts/mdx.ts`（导出可复用的纯文本/段落派生）、`src/lib/tokenize.ts`（新）、`src/lib/search.ts`（新）、`src/components/blog/PostList.tsx`、`src/components/blog/PostRow.tsx`（可选，显示片段）、`src/i18n/dictionaries.ts`（新文案，zh/en 都要）。
- **生成物**：新增 `src/generated/search.ts`，必须提交；CI 增加一条 `git diff --exit-code src/generated/search.ts`。
- **依赖**：`minisearch`（运行时）、无新增构建期依赖。
- **文档**：`docs/ARCHITECTURE.md` 补一条 search 支线的数据流。
- **不受影响**：Cloudflare Worker、评论、认证、prerender、sitemap/RSS。
