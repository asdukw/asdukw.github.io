# Spec Delta

## Purpose

让站点的每个页面对爬虫和分享卡片都具备正确的元信息，并向搜索引擎和订阅器提供 `robots.txt`、`sitemap.xml`、RSS 三类产物。

## ADDED Requirements

### Requirement: 每页输出专属 head 元信息

构建产物中每个页面必须（MUST）是一份自带专属 `<head>` 的 HTML，至少包含 `<title>`、`description`、`canonical` 与 `og:*`。元信息必须在 HTML 源码里，不得只靠运行时脚本写入。

#### Scenario: 文章页的标题与描述

- **WHEN** 构建后读取 `dist/post/2.html`（扁平输出，见 design.md D5）
- **THEN** `<title>` 含文章标题，`description` 与 `og:description` 为该文章的摘要

#### Scenario: 分享卡片带图

- **WHEN** 文章 frontmatter 提供 `image`
- **THEN** 该页 `og:image` 是该图片的绝对地址；未提供时使用站点默认分享图

### Requirement: canonical 与 hreflang 配对

每个页面必须（MUST）输出指向自身语言的 `canonical`。只有文章同时存在中英文正文时，才允许为中英两个地址互相输出 `hreflang` 配对；`x-default` 指向中文地址。列表页的标签筛选等查询参数不得（MUST NOT）改变 `canonical`。

#### Scenario: 双语文章互相声明

- **WHEN** 构建一篇中英文都存在的文章
- **THEN** 两个页面的 `<head>` 都含 `zh`、`en` 与 `x-default` 三条 alternate

#### Scenario: 单语文章不声明对方语言

- **WHEN** 构建只有中文正文的文章
- **THEN** 其中文页面不输出指向 `/en/...` 的 `hreflang="en"`

#### Scenario: 筛选列表归一

- **WHEN** 构建 `/post` 与 `/en/post`
- **THEN** 两者 `canonical` 分别指向不带查询参数的自身地址

### Requirement: sitemap 覆盖两种语言的公开页面

构建必须（MUST）产出 `dist/sitemap.xml`，列出首页、文章列表、关于页以及每篇文章在两种界面语言下的地址，并带 `lastmod`（取文章日期）。`/zh/*` 与 404 不得（MUST NOT）出现在其中。

#### Scenario: 文章地址成对出现

- **WHEN** 构建完成
- **THEN** `sitemap.xml` 同时含 `/post/2` 与 `/en/post/2`

#### Scenario: 归一化地址不入表

- **WHEN** 构建完成
- **THEN** `sitemap.xml` 不含任何 `/zh/` 开头的地址

### Requirement: robots.txt 指向 sitemap

构建必须（MUST）产出 `dist/robots.txt`，允许抓取全站并以绝对地址声明 sitemap 位置。

#### Scenario: 抓取规则与 sitemap 声明

- **WHEN** 读取 `dist/robots.txt`
- **THEN** 存在 `User-agent: *`、`Allow: /` 与一行 `Sitemap:` 绝对地址

### Requirement: RSS 按界面语言分语言提供

构建必须（MUST）产出 `/rss.xml`（中文界面视图）与 `/en/rss.xml`（英文界面视图），条目顺序与站内列表一致，每篇一条，正文取自预渲染 HTML，条目内引用资源必须（MUST）使用绝对地址。

#### Scenario: 中文 feed 内容

- **WHEN** 读取 `dist/rss.xml`
- **THEN** 条目与 `/post` 列表一致，`link` 为中文地址的绝对 URL，正文中的图片地址以 `https://` 开头

#### Scenario: 英文 feed 位置

- **WHEN** 读取 `dist/en/rss.xml`
- **THEN** 条目 `link` 为 `/en/...` 绝对 URL
