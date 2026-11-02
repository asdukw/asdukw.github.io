# Design

## Context

动机见 `proposal.md`，行为契约见 `specs/i18n-routing` 与 `specs/seo-artifacts`。这里只记录当前代码形状中约束了做法的部分。

当前状态：

- `src/App.tsx` 的 `<Routes>` 没有语言维度；`src/i18n/LanguageContext.tsx` 从 `localStorage["site.lang"]` 初始化 `lang`，这是全站语言的唯一来源。
- `src/lib/posts.ts` 已经把「界面语言」（`Lang`）与「正文语言」（`Post.lang`）分开，并用 `FALLBACK_LANG` 在缺版本时回退。这个分层要保留。
- `scripts/ssr-smoke.tsx` 已经能用 `createMemoryRouter` + `renderToString` 渲染每个路由，但只用来断言，不产出文件。
- `src/index.html` 是唯一的 HTML 模板，构建后成为 `dist/index.html`，引用带 hash 的 JS/CSS。
- `dist/_redirects` 是 `/*  /index.html  200`，为 SPA fallback 服务。
- 评论按整数 `post_id` 归属，`/api/comments?post_id=2` 与界面语言无关。

## Goals / Non-Goals

**Goals**

- URL 成为界面语言的唯一来源，无前缀路径的渲染是确定性的。
- 每个页面在构建产物里有专属 `<head>`，且正文也在静态 HTML 里。
- SEO 产物（robots / sitemap / RSS）由已有数据（`POSTS` + `site`）生成，不引入新的数据源。

**Non-Goals（本次明确不做）**

- 不引入 `hydrateRoot`，不做同构 hydration。
- 不做按文章生成 `og:image`。
- 不迁移框架（仍用 react-router + `bun build`），不做全站 SSG 框架化。
- 不保留 `localStorage` 的语言偏好（见 D1 的取舍）。

## Decisions

### D1：URL 是语言唯一来源，放弃语言持久化

`LanguageProvider` 改为从路由前缀推导 `lang`，不再读 `localStorage`。

**为什么**：预渲染要求「同一个 URL 永远渲染同一份 HTML」。只要语言还受 `localStorage` 影响，`/` 的静态产物和客户端首帧就可能不一致，而这一不一致恰恰只在「老访客」身上出现，最难复现。

**代价**：英语读者回到 `/` 会看到中文，除非书签 `/en/`。这是标准取舍，接受。

**备选**：`/` 在客户端读 `localStorage` 后重定向到 `/en/`。否决：给 `canonical` 页面加了不确定性，且引入一次闪烁，收益只对少数回头客成立。可以作为后续独立改动。

### D2：语言是路由结构，不是每个 `Link` 手写前缀

在 `App.tsx` 里把路由表按 `/:lang?` 之外的显式方案组织：`/en` 一条子树，无前缀一条子树，共用同一组页面组件。所有内部链接通过一个 `useLangPath()`（读当前前缀）构造，替换 7 个文件里的 12 处硬编码路径。

**为什么**：`<Route path="en" >` 子树能用 `useParams`/`useLocation` 直接拿到前缀，避免给每个组件加 prop；同时 `Navigate` 的 `/zh/* -> /*` 和 `/projects -> /about` 留在路由层，不污染组件。

**备选**：给路由加可选参数 `/:lang(en)?/post/:id`。否决：可选段会让「`/post` 到底是中文列表还是英文列表」依赖段位置推断，且 `/zh/post/2` 这类归一化地址会变成合法路由，与 spec 冲突。

### D3：预渲染复用 smoke 的渲染路径，以 `dist/index.html` 为壳

新增 `scripts/prerender.tsx`，从 `ssr-smoke.tsx` 抽出共用的渲染函数，对每个路由 `renderToString`，再拿 `dist/index.html` 当壳，把该页的 `<head>` 与正文注入进去，写成扁平 HTML 文件（形式见 D5）。

顺序：`bun build` 之后、`copy-404` 之前。因为壳必须是被 bundler 处理过的 `dist/index.html`（带 hash 资源引用）。

**为什么**：`bun build` 不能按路由出多个 HTML；而 `renderToString` 的能力已经在仓库里且已被 smoke 验证可用。这是最小增量。

**代价**：`index.html` 需要一个能被字符串替换的锚点（注入点），`bun build` 会压缩 HTML，锚点必须是构建后仍存在的标记（例如 `<div id="root"></div>` 注释形式），需要在实现时确认。见下面「已知未知」。

### D4：不引入 hydration，`createRoot` 保持原样

预渲染 HTML 的价值是「爬虫和分享卡片不用跑 JS 就能拿到正确 head 与正文」，不是首屏性能。

**为什么**：`hydrateRoot` 要求服务端与客户端首帧完全一致。任何一处不一致（时间、随机、`localStorage`、`matchMedia`）都会变成 console 警告甚至 DOM 重建。当前 `ThemeProvider` 与 `AuthContext` 都依赖浏览器状态，收窄一致性成本远高于收益。

**代价**：JS 加载完成后 React 会清空并重建 DOM，正文有一次不可见的重渲染。因为预渲染 HTML 里 CSS 已在 `<head>`，视觉上不需要等 JS 才成型。

### D5：预渲染输出扁平 `.html`，而不是目录式 `index.html`

`specs/i18n-routing` 要求 `/post/2` 是文章页。预渲染后静态文件会不会被 `_redirects`（`/* -> /index.html 200`）抢掉，`docs/DEPLOYMENT.md` 原来没记录。用本地 `wrangler pages dev dist`（与生产同一份 Pages 运行时）实测的结果：

| 输出形式 | `GET /post/2` 结果 |
| --- | --- |
| `dist/post/2/index.html` | 308 重定向到 `/post/2/`，静态文件优先于 `_redirects` |
| `dist/post/2.html` | 200 直接返回该文件，无重定向 |
| 没有对应文件（`/post`） | 命中 `_redirects`，回落到 `dist/index.html` 壳 |

结论两条：**静态文件优先于 `_redirects`**，所以不需要兜底方案；但目录式输出会带来一次尾斜杠重定向，把 canonical 地址变成 `/post/2/`。因此预渲染一律输出扁平文件（`dist/post/2.html`、`dist/en/post/2.html`、`dist/about.html`、`dist/en.html`），首页直接重写 `dist/index.html`。

**这一结论已在本地 Pages 运行时验证；首次正式部署时再对生产域名复核一次。**

### D6：SEO 产物由一个脚本从现有数据生成

`scripts/build-seo.ts` 从 `POSTS`（`src/generated/posts.ts`）和 `site.baseUrl` 生成 `robots.txt`、`sitemap.xml`、`rss.xml`、`dist/en/rss.xml`。

**为什么**：这些产物全是「已有数据的另一种视图」，不值得为它们引入 SSG 框架或额外依赖。`hreflang` 配对规则（按 `id` 分组、两语言都在才配对）与 `posts.ts` 已有的 `getPostTranslations` 语义一致。

**代价**：RSS 的正文字符串需要把 `/images/...` 改成绝对地址，这是一次正则替换，属于可接受的做法。

### D7：`og:image` 用一张静态图 + 可选 frontmatter 覆盖

`public/og.png`（1200x630）作为默认，frontmatter 加可选 `image:` 覆盖。

**为什么**：按篇生成要引入 `satori`/`resvg` 类构建依赖，与「新增依赖先说明理由」冲突，在两篇文章的规模上收益不成立。

## Risks / Trade-offs

- **预渲染 HTML 与 CSR 结果不一致** → 不做 hydration，所以不会触发 mismatch 错误；但替换锚点若依赖易变的压缩输出，构建会静默产出坏页。Mitigation：`scripts/ssr-smoke.tsx` 增加一步断言 `dist/*/index.html` 里含预期 `<title>`，让漂移变成构建失败而不是线上问题。
- **未知路径回落到预渲染首页** → `_redirects` 把没对应文件的路径指向 `dist/index.html`，而现在它已经是预渲染过的首页，所以访问 `/nope` 会先看到首页内容、再由客户端切成 404。Mitigation：该页的 `canonical` 指向 `/`，不会造成重复索引；真的是问题的话，后续可以改成真正的 `404.html`（需要先确认 Pages 的原生 SPA fallback 行为变化）。
- **URL 形状改动是本轮唯一的破坏性变更** → 中文地址不变，受影响面仅限英文界面链接；`/zh/*` 做归一化重定向，避免未来出现重复内容。
- **语言行为缺少回归测试** → smoke 目前只断言文章标题与锚点存在，测不出语言错乱。Mitigation：补「同一路由在两种前缀下界面文案不同」的断言，这是本次唯一值得新增的测试。
- **`sitemap` 声明了正文语言不存在的地址** → 只给真有对应语言版本的 URL 输出 `hreflang`；`/en/post/1`（无英文正文）在 sitemap 中保留但不配对。

## Migration Plan

1. Phase 1（URL 前缀）先落，中文地址行为不变，可独立上线。
2. Phase 2 用本地 Pages 运行时完成 D5 的优先级实验。
3. Phase 3 补齐 SEO 产物、分享图与预渲染。
4. 首次正式部署时在线上复核 `/post/2` 返回 200 且标题正确。

回滚：每一步都是「新增文件 + 少量改动」，回滚 = 还原该 Phase 的提交；预渲染产物不写进仓库（`dist/` 是构建产物），不影响回滚。

## Open Questions

（已解决）预渲染的注入锚点：`bun build` 之后 `dist/index.html` 里的 HTML 注释会原样保留，所以用成对的 `<!--head:start-->` / `<!--head:end-->` 标记元信息区段，正文注入点用 `<div id="root"></div>`。这两处都是显式锚点，不依赖压缩输出的稳定形状。
