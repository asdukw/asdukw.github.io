# Proposal

## Why

正文里现在只有一种强调方式：Markdown 引用块（`>`），它和普通段落只差一根左边线和一点灰底。「免责声明」「这项报错一般是代理问题」「别把密码写进配置文件」这类读者不该漏掉的内容，混在正文里扫读时很容易滑过去。现有文章里已经有三处这类段落，作者只能靠加粗自救。

需要给正文一种**能被扫读看见**的块级元素：带颜色和固定标题的提示块，写法保持 Markdown 的纯度（不引入需要 hydrate 的组件），且渲染结果必须是预渲染 HTML 里的静态标签——爬虫和分享卡片看到的和读者看到的一致。

## What Changes

- **新增 callout 语法**：正文用 GitHub Alerts 形式的引用块表达提示块：

  ```markdown
  > [!WARNING]
  > 课程资料版权归学校和各位老师所有，请只用于自己学习。
  ```

  支持 `NOTE` / `TIP` / `IMPORTANT` / `WARNING` / `CAUTION` 五种，大小写不敏感。
- **新增构建期转换**：一个 remark 插件把这些引用块改写成 `<div class="callout callout-warning">`，并在块首插入该类型的小标题（如「警告」）。转换发生在 `scripts/mdx.ts` 的 MDX 编译阶段，产物是静态 HTML——不需要客户端 JS，也不需要 React 组件。
- **新增样式**：`src/index.css` 里为五种 callout 定义配色（浅色 / 深色各一套），跟随站点既有的 `.dark` 约定；普通的 `>` 引用块样式保持不变。
- **标题语言跟随正文语言**：`zh` 正文的 callout 标题是中文，`en` 正文是英文。这与「正文语言由 frontmatter 的 `lang` 决定、与界面语言无关」的既有规则一致。
- **语义与降级**：无法识别的类型标记（如 `[!FOO]`）不报错也不吞内容，按普通引用块渲染。
- **新增** `scripts/remark-callout.ts`、正文样式、`docs/CONTENT.md` 的写法说明，并在 smoke 里固定「这种写法一定编译出静态 callout」。

不做的事：不加 MDX 组件（`docs/CONTENT.md` 明确不支持，且 `scripts/mdx.ts` 的 `evaluate` 没有组件作用域）；不做可折叠块、自定义颜色、图标库、任意标题文案。

## Capabilities

### New Capabilities

- `article-callouts`: 正文提示块——作者用 GitHub Alerts 语法写，构建期转换成带类型语义的静态 HTML 块，标题语言跟随正文语言，未知类型退回普通引用块。

### Modified Capabilities

<!-- 无。content-search 不索引 callout 特有的内容（它索引的是剥标签后的正文文本，callout 正文自然包含在内）。 -->

## Impact

- **代码**：`scripts/remark-callout.ts`（新）、`scripts/mdx.ts`（接插件，并把文章语言传进去）、`src/index.css`（样式，随后重编 `src/styles.css`）。
- **内容**：`src/content/*.mdx` 里已有的三处提示性段落可以改成 callout（可选，不强制）。
- **生成物**：`src/generated/posts.ts` 与 `src/generated/search.ts` 会因插件改动而变化，需一起提交（CI 已有漂移检查）。
- **文档**：`docs/CONTENT.md` 补写法；`docs/STYLING.md` 补配色约定。
- **不受影响**：路由、i18n、评论、prerender、搜索的查询逻辑、Worker。
