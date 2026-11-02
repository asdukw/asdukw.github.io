# article-callouts Specification

## Purpose

让作者用一种 Markdown 原生、无需客户端脚本的写法在正文里标注提示块，构建期把它渲染成带类型语义的静态 HTML：读者扫读时能一眼看出「这是警告」，爬虫与分享卡片拿到的也是同一份静态内容。

## Requirements

### Requirement: 用 GitHub Alerts 语法标记提示块

正文必须（MUST）支持用引用块首行的 `> [!TYPE]` 标记声明提示块，`TYPE` 取 `NOTE`、`TIP`、`IMPORTANT`、`WARNING`、`CAUTION` 之一。类型标记必须（MUST）大小写不敏感。

#### Scenario: 基本写法

- **WHEN** 正文里写 `> [!NOTE]` 开头、随后是若干行 `>` 引用的内容
- **THEN** 这段内容渲染成提示块，而不是普通引用块

#### Scenario: 类型大小写不敏感

- **WHEN** 写成 `> [!warning]`（全小写）
- **THEN** 渲染结果与 `> [!WARNING]` 相同

### Requirement: 每种类型渲染出可区分的语义标记

提示块必须（MUST）在构建产物里带有该类型的稳定标记，使五种类型在样式和自动化检查上可区分；并且必须（MUST）是构建期生成的静态标签，不依赖客户端脚本还原。

#### Scenario: 生成静态标签

- **WHEN** 构建完成，读取预渲染出的 HTML
- **THEN** 该提示块是 `<div class="callout callout-warning">` 形式的静态元素，而不是 `<blockquote>` 加一段运行时才处理的标记文本

#### Scenario: 五种类型各不相同

- **WHEN** 同一篇文章里分别写 NOTE、TIP、IMPORTANT、WARNING、CAUTION 五种提示块
- **THEN** 五者各自带有 `callout-note` / `callout-tip` / `callout-important` / `callout-warning` / `callout-caution` 之一，互不重复

#### Scenario: 类型标记不出现在正文里

- **WHEN** 提示块渲染完成
- **THEN** 呈现给读者的文本里不含 `[!WARNING]` 这类原始标记

### Requirement: 提示块自带标题且语言跟随正文语言

每个提示块必须（MUST）以一个固定小标题开头，标题语言由**正文语言**（frontmatter 的 `lang`）决定，而不是由界面语言决定。

#### Scenario: 中文正文

- **WHEN** `lang: zh` 的文章里写 `> [!NOTE]`
- **THEN** 该提示块的标题是中文（「注意」）

#### Scenario: 英文正文

- **WHEN** `lang: en` 的文章里写 `> [!NOTE]`
- **THEN** 该提示块的标题是英文（「Note」）

#### Scenario: 英文界面下的中文正文

- **WHEN** 在 `/en/post/2` 阅读一篇只有中文正文的文章，其正文含 `> [!NOTE]`
- **THEN** 提示块标题仍是中文，与该页正文语言一致

### Requirement: 未知类型退回普通引用块

无法识别的类型标记必须（MUST NOT）导致构建失败，也 MUST NOT 丢弃内容：该块按普通引用块渲染，原始文本照原样保留。

#### Scenario: 拼错的类型

- **WHEN** 写 `> [!WARNNG]`（拼写错误）
- **THEN** 构建成功，这段内容渲染为普通引用块，读者能看到原文里的标记文本

#### Scenario: 普通引用块不受影响

- **WHEN** 正文里写一个不带 `[!TYPE]` 标记的普通 `>` 引用块
- **THEN** 它仍按原来的引用块样式渲染，不会被当成提示块

### Requirement: 提示块支持多段与嵌套 Markdown

提示块内容必须（MUST）支持多段落、列表、代码、链接等行内与块级 Markdown，而不仅是单段纯文本。

#### Scenario: 多段提示块

- **WHEN** 提示块里用 `>` 空行分隔写出两个段落
- **THEN** 两个段落都在提示块内部，且都保持段落结构

#### Scenario: 提示块内的列表与代码

- **WHEN** 提示块里包含列表或行内代码
- **THEN** 列表和代码正常渲染，且仍位于提示块内部

### Requirement: 提示块与搜索互相兼容

正文检索必须（MUST）能搜到提示块里的文字，且提示块在搜索结果片段里不得（MUST NOT）出现 `[!TYPE]` 标记文本。

#### Scenario: 搜索提示块里的内容

- **WHEN** 搜索一个只出现在某个提示块里的词
- **THEN** 该文章出现在搜索结果中

#### Scenario: 片段不含标记

- **WHEN** 搜索命中提示块内的文字
- **THEN** 命中片段里是正常句子，不含 `[!WARNING]` 之类的原始标记

### Requirement: 正文语言变化时提示块标题随之变化

同一篇内容被声明为不同正文语言时，提示块标题必须（MUST）随之切换，不需要作者改正文。

#### Scenario: 同内容两种语言版本

- **WHEN** 两篇 `id` 相同、正文 markdown 相同、`lang` 分别为 `zh` 与 `en` 的文章各含一个 `> [!TIP]`
- **THEN** 中文版本标题为中文，英文版本标题为英文
