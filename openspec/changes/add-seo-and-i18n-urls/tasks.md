# Tasks

## 1. URL 语言前缀

- [x] 1.1 把 `LanguageProvider` 的语言来源改成路由前缀，并在 `src/App.tsx` 里建立 `/en` 子树与无前缀子树共用同一组页面组件；验证：`bun run typecheck` 通过，且本地 `bun dev` 下 `/` 与 `/en/` 分别显示中文与英文导航。
- [x] 1.2 新增 `useLangPath()` 类链接构造方式，替换 `src/pages/*` 与 `src/components/*` 里 12 处硬编码站内路径；验证：`rg -n 'to="/|to=\{\`/' src` 只剩路由层与非站内链接，且英文界面下点击导航、文章卡片、标签、上一页/下一页都落在 `/en/...`。
- [x] 1.3 在路由层加 `/zh/*` → 去前缀等价地址的归一化重定向，并保留 `/projects` → `/about` 在两种前缀下的行为；验证：访问 `/zh/post/2` 落在 `/post/2`，`/en/projects` 落在 `/en/about`。
- [x] 1.4 给 `scripts/ssr-smoke.tsx` 加语言回归断言：同一路由在两种前缀下渲染出的界面文案不同，且 `/en/post/1`（无英文正文）正文为中文；验证：`bun run smoke` 在断言存在时通过，故意把 `LanguageProvider` 改回读 `localStorage` 时该断言失败。
- [x] 1.5 更新 `docs/ARCHITECTURE.md`，写清「URL 前缀决定界面语言、`Post.lang` 与界面语言无关、语言不再持久化」；验证：文档中的描述与实际路由表一致。

## 2. SEO 静态产物（不依赖预渲染）

- [x] 2.1 在 `src/lib/site.ts` 增加 `baseUrl`（`https://asdukw.pages.dev`）与默认 `ogImage`，并让 `docs/DEPLOYMENT.md` 里散写的站点地址引用它；验证：`bun run typecheck` 通过。
- [x] 2.2 新增 `scripts/build-seo.ts` 生成 `dist/robots.txt`；验证：构建后文件含 `User-agent: *`、`Allow: /` 与一行绝对地址的 `Sitemap:`。
- [x] 2.3 同一脚本生成 `dist/sitemap.xml`：首页、文章列表、关于页、每篇文章分别在两种界面语言下的地址，带 `lastmod`，不含 `/zh/*` 与 404；验证：构建后 `/post/2` 与 `/en/post/2` 同时出现，`grep '/zh/'` 无结果。
- [x] 2.4 同一脚本生成 `dist/rss.xml` 与 `dist/en/rss.xml`，条目顺序与站内列表一致，`link` 为绝对地址，正文中的 `/images/...` 转成绝对地址；验证：构建后两份 feed 的条目数等于各自语言列表长度，条目正文里的图片地址以 `https://` 开头。
- [x] 2.5 新增 `public/og.png`（1200x630）作为默认分享图，支持 frontmatter 可选 `image:` 覆盖，并在 `docs/CONTENT.md` 记录该字段；验证：`bun run build:content` 后 `src/generated/posts.ts` 里带上该字段（有则出现）。
- [x] 2.6 把 `build-seo.ts` 接进 `package.json` 的 `build` 链（在 `bun build` 之后），并让 `scripts/copy-assets.ts` 之外的产物不被后续步骤覆盖；验证：`bun run build` 后 `dist/` 同时存在 `robots.txt`、`sitemap.xml`、`rss.xml`、`en/rss.xml`。

## 3. 预渲染可行性实验（block 级）

- [x] 3.1 确认 `bun build` 之后的 `dist/index.html` 里存在可稳定替换的注入锚点（`<div id="root">` 或新增的注释锚点），据此定下注入点形式并记入 `design.md` 的 Open Questions；验证：构建后对 `dist/index.html` 做一次字符串替换试验，替换结果能被 `grep` 命中。
- [x] 3.2 造一份带显式标记的 `dist/post/2/index.html`，部署一次并用 `curl -I https://asdukw.pages.dev/post/2` 判定 Cloudflare Pages 的静态文件与 `_redirects` 优先级（部署需单独确认）；验证：把实测结论写进 `docs/DEPLOYMENT.md` 的 SPA fallback 一节。
- [x] 3.3 （不适用，已确认跳过）实验结论是「静态文件优先」，不需要兜底方案；结论已写入 `design.md` 的 D5 与 `docs/DEPLOYMENT.md`。

## 4. 预渲染各页 head

- [x] 4.1 从 `scripts/ssr-smoke.tsx` 抽出可复用的单路由渲染函数，smoke 与新的 `scripts/prerender.tsx` 共用；验证：`bun run smoke` 仍通过且不再有重复的路由/Provider 装配代码。
- [x] 4.2 `prerender.tsx` 为每个路由写出 `dist/<route>/index.html`，注入 `<title>`、`description`、`canonical`、`og:*`、`<html lang>` 与正文；验证：`dist/post/2/index.html` 的 `<title>` 含文章标题，`og:description` 是该文摘要。
- [x] 4.3 按 `id` 分组输出 `hreflang` 配对与 `x-default`，只在中英正文都存在时配对；验证：双语文章页含 `zh`/`en`/`x-default` 三条 alternate，只有中文正文的文章页不含 `hreflang="en"`。
- [x] 4.4 把 `prerender.tsx` 接进 `build` 链（`bun build` 之后、`copy-404` 之前），并给 smoke 加一条对构建产物 `dist/*/index.html` 的元信息断言，让注入锚点漂移变成构建失败；验证：`bun run build && bun run smoke` 通过。
- [x] 4.5 更新 `docs/DEPLOYMENT.md` 的构建顺序小节与 `docs/ARCHITECTURE.md` 的渲染说明（预渲染只服务爬虫与分享卡片，运行时仍是 `createRoot`）；验证：文档描述的步骤与 `package.json` 的 `build` 一致。

## 5. 集成验证

- [x] 5.1 按 CI 顺序跑完整链路：`bun run build:content && bun run typecheck && bun run typecheck:worker && bun run lint && bun run smoke && bun run build`；验证：全部通过，且 `git status` 中 `src/generated/posts.ts` 无未提交漂移。

## Workflow follow-up

- 归档前人工确认：`/post/2`、`/en/post/2`、`/en/post/1` 三个地址在部署后都按 spec 渲染。
- 首次正式部署时复核 `design.md` D5 的本地结论（生产域名上 `/post/2` 应为 200 而非 308）。
- 归档该 change 用 `/openspec-archive-change`，把两个 delta spec 合进 `openspec/specs/`。
