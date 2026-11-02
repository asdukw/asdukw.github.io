# Proposal

## Why

站点是没有服务端渲染的纯 SPA：所有路由共用 `src/index.html` 里那一组 `og:*`，界面语言只存在 `localStorage`。结果是文章分享出去卡片标题永远是「asdukw」、没有配图，站点也没有 `robots.txt` / `sitemap.xml` / RSS，搜索引擎既抓不到文章级元信息，也无法把中英两个版本识别为同一页面的对照关系。

现在只有两篇文章、链接还没有散出去，是改 URL 形状成本最低的时刻。再往后改，代价是已分享链接和已建立的搜索索引。

## What Changes

- 界面语言进入 URL：默认中文不带前缀（`/post/2`），英文用 `/en/*`。URL 是语言的唯一来源，界面语言不再存进 `localStorage`（无前缀路径的渲染因此是确定性的，可预渲染）。
- 新增内部链接构造方式，替换当前散落在组件里的硬编码路径。
- 构建期按路由预渲染 HTML，为每个页面注入专属 `<title>` / `description` / `canonical` / `og:*` / `hreflang`，正文与 `<html lang>` 也随静态 HTML 输出。渲染仍用 `createRoot`，不引入 hydration。
- 新增 `site.baseUrl`，并据此生成 `robots.txt`、`sitemap.xml`（含 hreflang 配对）和 `rss.xml`。
- 新增一张通用 `og.png`，文章可用 frontmatter 的 `image:` 覆盖。
- smoke 脚本补充语言回归断言。

**BREAKING**：英文界面下的可分享地址从 `/post/2` 变为 `/en/post/2`。中文地址不变，`/post/2` 继续是中文版。

## Capabilities

### New Capabilities

- `i18n-routing`: URL 决定界面语言，语言前缀的读写、内部链接构造、语言切换路径保持、以及没有对应正文语言版本时的回退语义。
- `seo-artifacts`: 构建期产出 `robots.txt`、`sitemap.xml`、`rss.xml` 以及每页的 `<head>` 元信息，含 `canonical` 与 `hreflang` 的生成规则。

### Modified Capabilities

（无。项目此前没有 spec。）

## Impact

- **代码**：`src/App.tsx`（路由表）、`src/i18n/LanguageContext.tsx`（语言状态来源）、`src/lib/site.ts`（`baseUrl`、`ogImage`）、`src/hooks/usePageTitle.ts`（改为写 meta 的工具或并入预渲染）、7 个组件里 12 处硬编码内部链接。
- **构建**：`package.json` 的 `build` 链路新增预渲染与 SEO 产物生成两步，插入在 `bun build` 之后、`copy-404` 之前；新增 `scripts/prerender.tsx`、`scripts/build-seo.ts`。
- **部署**：`dist/_redirects` 的 SPA fallback 与预渲染产物可能冲突，需要在 `docs/DEPLOYMENT.md` 记录实测结论。
- **Worker**：无改动。评论按整数 `post_id` 归属，中英版本天然共享评论区。
- **依赖**：不新增运行时或构建依赖（og 图为静态资源，不做按篇生成）。
- **文档**：`docs/DEPLOYMENT.md`、`docs/ARCHITECTURE.md`、`docs/CONTENT.md`（frontmatter `image:`）、`README.md` 需要同步。
