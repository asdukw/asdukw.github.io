# Tasks

## 1. remark 插件

- [ ] 1.1 新增 `scripts/remark-callout.ts`，导出 `remarkCallout(lang)` 插件工厂：识别 `blockquote` 首段的 `[!NOTE|TIP|IMPORTANT|WARNING|CAUTION]`（大小写不敏感、首尾空白容忍），删掉标记段落，给块打 `data.hName = "div"` 与 `className: ["callout", "callout-<kind>"]`，并在块首插入标题段落。验证：`bun -e` 里对一段含五种类型的 markdown 跑一遍 mdast 变换，断言每种类型的 `hProperties.className` 与插入的标题文本都正确。
- [ ] 1.2 在插件里处理两个边界：标记段落删掉后若正文为空，不留下空段落；无法识别的标记（`[!FOO]`、`[!NOTE] 后跟文字`、普通引用块）不转换、内容原样保留。验证：`bun -e` 断言 `[!FOO]` 的块没有任何 `hName` 改写，且原文文本仍在 children 里。

## 2. 接入编译管线

- [ ] 2.1 在 `scripts/mdx.ts` 里把 `renderMdx` 改成接受正文语言，并把 `remarkCallout(lang)` 加进 `remarkPlugins`（`remarkGfm` 之后）。验证：`bun -e` 用 `renderMdx("> [!WARNING]\n> 仅供自学", "zh")` 断言输出 HTML 含 `callout-warning` 与「警告」，且不含 `[!WARNING]`。
- [ ] 2.2 用 `lang: "en"` 跑同一个源串，断言标题是英文且 class 相同；再把两篇同 `id` 不同 `lang` 的实际文章编译一次，断言各自标题语言正确。验证：`bun -e` 两条断言都通过。
- [ ] 2.3 跑 `bun run build:content`，确认 `src/generated/posts.ts` 与 `src/generated/search.ts` 一起更新且没有报错；`git diff --stat` 里两个文件的改动只来自 callout 相关文本。验证：`bun run build:content && git diff --exit-code`（重跑一次应无进一步变化）。

## 3. 样式

- [ ] 3.1 在 `src/index.css` 里给五种 callout 定义 `--callout-accent` / `--callout-bg`（浅色定义在 `.prose-article .callout-<kind>`，深色覆盖在 `.dark .prose-article .callout-<kind>`），并给 `.callout` 加左侧色条、圆角、内边距、与正文的垂直间距；`.callout-title` 用强调色 + 小字重。验证：`bun run css` 后 `src/styles.css` 里能 grep 到 `.callout-warning`，且 `git diff --numstat src/styles.css` 只有新增行。
- [ ] 3.2 确认普通引用块样式未被改动：`src/index.css` 里 `.prose-article blockquote` 规则逐字不变。验证：`git diff src/index.css` 里该规则无改动行。
- [ ] 3.3 在 `docs/STYLING.md` 里补 callout 的配色约定（变量名、深浅两套、要改颜色改哪里）。验证：文档里出现的变量名与 `src/index.css` 实际定义一致（逐条 grep）。

## 4. 文档与内容

- [ ] 4.1 在 `docs/CONTENT.md` 的「正文规则」里补写法：支持的五种类型、标记必须独占一行、标题语言跟随 `lang`、未知类型退回普通引用块。验证：照文档里的示例写一段 MDX 并 `bun run build:content`，产物里出现对应 callout。
- [ ] 4.2 把 `src/content/bb-sync.zh.mdx` 里的免责声明改成 `> [!WARNING]`（唯一一处内容改动，作为真实样例）。验证：`bun run build:content` 后 `src/generated/posts.ts` 里该段是 `callout-warning`，且 `bun run smoke` 通过。
- [ ] 4.3 在 `scripts/ssr-smoke.tsx` 里加断言：`renderMdx` 出的 HTML 含 `callout-warning` 与标题文本；未知类型不产生 `callout-` class；`getPost(2, "zh")` 的 HTML 含该 callout。验证：`bun run smoke` 通过，并临时改坏一条断言确认它会失败。

## 5. 集成验证

- [ ] 5.1 跑完整 CI 序列：`bun run build:content && bun run typecheck && bun run typecheck:worker && bun run lint && bun run smoke && bun run build`，全绿。
- [ ] 5.2 验收渲染结果：`dist/post/2.html` 里出现 `<div class="callout callout-warning">`（静态、无需 JS）、标题文本存在、原始 `[!WARNING]` 标记不出现；同时确认 `dist/post/2.html` 的搜索索引文本里能找到该 callout 的正文。验证：对 `dist/` 产物 grep 三条，并用 `searchPosts` 搜一句只出现在该提示块里的文字。

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
