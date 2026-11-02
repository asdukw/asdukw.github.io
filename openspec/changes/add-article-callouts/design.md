# Design

## Context

见 `proposal.md` 的 Why。设计要迁就的现状：

- 正文管线是 `scripts/mdx.ts`：`gray-matter` → `remark-gfm` → `@mdx-js/mdx` 的 `evaluate` → `rehype-slug` / 收集 TOC / `rehype-autolink-headings` / `rehype-highlight` → `renderToStaticMarkup`。浏览器不打包 MDX。
- `docs/CONTENT.md` 明确「不支持自定义 JSX 组件」：`evaluate` 没有组件作用域，站点也不 hydrate。所以 callout 只能是**语法扩展 + 静态 HTML**，不能是 React 组件。
- `src/index.css` 已经有一套正文配色约定：颜色变量定义在 `.prose-article`，深色在 `.dark .prose-article` 里覆盖；`styles.css` 由 Tailwind CLI 编译且必须提交。
- 正文语言由 frontmatter 的 `lang` 决定，与界面语言无关（`i18n-routing` spec 已固定这条规则）。callout 标题属于正文，必须跟随正文语言。
- 搜索索引的是剥掉标签后的正文纯文本（`scripts/search-index.ts`），所以 callout 文字天然进索引——但标记文本不能被带进去。

## Goals / Non-Goals

**Goals:**

- 写法是纯 Markdown，GitHub 与编辑器预览也能正确显示。
- 产物是预渲染 HTML 里的静态标签，零客户端 JS。
- 五种类型在样式与自动化检查上可区分；标题是真实文本节点。
- 未知类型不破坏构建、不吞内容。

**Non-Goals:**

- 不做可折叠 / 可关闭的提示块（需要客户端状态）。
- 不做自定义颜色、自定义标题文案、图标库。
- 不把现有文章里的提示性段落全部改写（内容改动与能力改动分开）。
- 不改 `content-search` 的查询逻辑。

## Decisions

### 决策 1：语法用 GitHub Alerts，不用 kramdown IAL、也不用 MDX 组件

| 备选 | 为什么不选 |
|---|---|
| **GitHub Alerts**（`> [!NOTE]`） | 选中：复用已有的 `>` 引用块语法，GitHub / VS Code / Obsidian 都认；不需要新的属性行解析器 |
| kramdown IAL（`{: .note }`，just-the-docs 的做法） | 那是 kramdown 的方言，remark 不认；要自己写一套属性行解析，且预览工具不显示 |
| MDX 组件（`<Callout type="warning">`） | `docs/CONTENT.md` 明确不支持，`evaluate` 没有组件作用域 |
| 自定义围栏（`:::warning`） | 要额外写围栏解析插件，且没有现成的生态认同 |

### 决策 2：在 remark（mdast）层实现，用 `data.hName` 交给 rehype

插件先 `visit` 收集全部 `blockquote`，再统一改写（在遍历中改 `children` 会让遍历索引失效，下一个兄弟读回来是 `undefined`）。对每个块：首个子节点必须是 `paragraph`，其首个子节点必须是 `text`，且以 `^\[!(TYPE)\][ \t]*(?:\n|$)` 开头。命中后：

1. 从该 text 节点里切掉标记本身（标记与正文在同一个 text 节点里，中间是软换行——这是实现时实测的 AST 形状，不是「标记独占一个段落」）；
2. 若切完该段落变空，整段移除；
3. 给 blockquote 节点打上 `data = { hName: "div", hProperties: { className: [...] } }`；
4. 在最前面插入标题段落。

在 mdast 层做而不是 rehype 层：此时内容还是结构化节点（段落、列表、代码都是 `children`），改写容器不会碰到内容；如果先渲染成 hast 再改，就得重新解析文本和结构。

`blockquote` 节点自带的 `data.hName` 会被 remark-rehype 用在输出元素上，所以不需要额外的 hast 插件。

插件注册必须用 `[remarkCallout, lang]` 这种「插件 + 选项」数组形式：直接写 `remarkCallout(lang)`（已是 transformer）会被 unified 当成 attacher 无参调用，`tree` 为 `undefined`。

### 决策 3：标题作为真实文本节点插入，而不是 CSS `::before`

标题用 `paragraph` + `data.hName = "p"` + class `callout-title` 插入到块首，内容是纯文本。理由：

- `::before` 的内容不可复制、不可被页面内查找命中、进不了搜索索引，屏幕阅读器的行为也因实现而异；
- 真实文本节点会被 `scripts/search-index.ts` 的剥标签逻辑自然收进索引（搜「警告」能找到用了 WARNING 的文章）；
- 预渲染 HTML 里能直接断言「标题存在」，测试成本低。

### 决策 4：标题语言来自正文 `lang`，插件工厂接参数

`remarkCallout(lang)` 返回插件函数，`compilePost` 把已经解析好的 `lang` 传进 `renderMdx`。标题映射：

| 类型 | zh | en |
|---|---|---|
| NOTE | 注意 | Note |
| TIP | 提示 | Tip |
| IMPORTANT | 重要 | Important |
| WARNING | 警告 | Warning |
| CAUTION | 小心 | Caution |

不用界面语言（`useLang()`）：callout 是正文的一部分，而本站的既有规则是「正文语言与界面语言无关」（`/en/post/2` 可以是英文界面 + 中文正文）。用界面语言会让同一篇文章在不同前缀下渲染出两份不同的 HTML，预渲染也就没法保证一致。

### 决策 5：未知类型原样保留，不做部分剥离

`[!FOO]`、`[!WARNNG]`、或标记后面跟了别的文字（`> [!NOTE] 备注`）——都不转换，整块按普通引用块渲染，原文照旧。理由：作者拼错时最需要看到原文，静默吞掉标记会让人以为写对了；而「猜测意图」在构建期没有可靠的兜底。

### 决策 6：配色复用现有变量体系，不引入图标

五种类型各给一对变量：`--callout-<kind>`（强调色）与 `--callout-<kind>-bg`（带 alpha 的底色），浅色写在一个 `.prose-article` 变量块里，深色只在一个 `.dark .prose-article` 变量块里覆盖——与 `--code-*` 完全同一个套路，也满足 `docs/STYLING.md`「暗色只覆盖变量，不要在 `.dark` 里重复写选择器」的要求。`.callout-<kind>` 只负责把这对变量映射到 `--callout-accent` / `--callout-bg`。

底色直接写成 `oklch(... / 0.07)`（深色 `0.12`~`0.14`），**不用 `color-mix()`**：lightningcss 会把它降级成满不透明度的兜底色，`--selection` 那里踩过同一个坑。

不引入图标库：`lucide-react` 是 React 组件，静态 HTML 里用不了；内联 SVG 要写进 HTML，会让内容与实现耦合。区分靠左侧色条 + 带颜色的标题，这也是 just-the-docs 的做法。

### 决策 7：普通引用块样式不动

`src/index.css` 里已有的 `.prose-article blockquote` 保持原样。callout 是 `div`，不会命中这条规则，两者互不影响。

## Risks / Trade-offs

- **标记必须独占一行**：`> [!NOTE] 备注` 不转换（见决策 5） → 在 `docs/CONTENT.md` 里写清「标记单独一行」，并让未知类型的行为可预测。
- **标题文本会进搜索索引**：搜「警告」可能命中所有用了 WARNING 的文章，即使正文没写这两个字 → 接受：这与「标题可搜」是一致的，而且命中后片段里能看到标题。
- **生成物会变**：插件改动会影响 `src/generated/posts.ts` 与 `src/generated/search.ts`（多出 class 与标题文本，`html` 字段变化） → 两个生成物一起重新生成并提交；CI 已有漂移检查兜底。
- **已有的普通引用块不受影响，但作者可能想改**：改不改是内容决定 → 本 change 不动正文，另开一次内容提交。
- **`data.hName` 依赖 remark-rehype 的约定** → `@mdx-js/mdx` 内部就走 remark-rehype，属于稳定行为；smoke 里有断言固定它。

## Migration Plan

1. 插件与样式上线后，旧的 `> ...` 引用块行为完全不变，不需要迁移任何内容。
2. 需要提示块的文章按新写法改写即可，改一篇生效一篇；`build:content` 会重新生成两个生成物。
3. 回滚：revert 提交并重新 `build:content`，正文里的 `[!NOTE]` 会退回成普通引用块（内容不丢）。

## Open Questions

- 是否给 callout 加一个可复制到剪贴板的短锚点（便于在评论区引用某条警告）——与提示块本身的能力无关，可另开 change。
