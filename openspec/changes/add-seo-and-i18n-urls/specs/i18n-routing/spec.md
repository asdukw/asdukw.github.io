# Spec Delta

## Purpose

让界面语言成为地址的一部分，使同一个页面的中英两种呈现各自拥有稳定、可分享、可被索引的 URL，同时保持已有中文地址可用。

## ADDED Requirements

### Requirement: URL 前缀决定界面语言

站点的界面语言必须（MUST）只由 URL 路径前缀决定：无前缀路径是中文，`/en` 前缀是英文。渲染时不得读取 `localStorage` 决定语言。

#### Scenario: 无前缀路径渲染中文界面

- **WHEN** 访问 `/post/2`
- **THEN** 导航、按钮与状态文案为中文，`<html lang="zh-CN">`

#### Scenario: `/en` 前缀渲染英文界面

- **WHEN** 访问 `/en/post/2`
- **THEN** 导航、按钮与状态文案为英文，`<html lang="en">`

#### Scenario: 两个语言首页各自独立

- **WHEN** 分别访问 `/` 和 `/en/`
- **THEN** 两者渲染同一份内容结构，界面文案分别为中文和英文

### Requirement: 已有中文地址保持不变

中文界面必须（MUST）使用不带语言前缀的地址。系统不得（MUST NOT）把已有地址重定向到带前缀的形式；`/zh/*` 形式的地址必须重定向到去掉前缀的等价地址。

#### Scenario: 老链接继续可用

- **WHEN** 访问此前分享出去的 `/post/2`
- **THEN** 直接返回中文文章页，不经过任何重定向

#### Scenario: `/zh` 前缀被归一

- **WHEN** 访问 `/zh/post/2`
- **THEN** 重定向到 `/post/2`

### Requirement: 站内链接携带当前语言

站内链接必须（MUST）按当前界面语言构造：中文界面下不带前缀，英文界面下带 `/en` 前缀，并且保留当前查询参数。

#### Scenario: 英文界面下的列表与详情链接

- **WHEN** 在 `/en/post` 点击一篇文章
- **THEN** 跳转到 `/en/post/2`

#### Scenario: 标签筛选保留语言

- **WHEN** 在 `/en/post/2` 点击标签「港中深」
- **THEN** 跳转到 `/en/post?tag=港中深`

### Requirement: 语言切换停留在当前页面

切换语言必须（MUST）导航到等价 URL，而不是替换文案后留在原地址。当前路径与查询参数都必须保留。

#### Scenario: 文章页切换语言

- **WHEN** 在 `/post/2` 点击切换到英文
- **THEN** 地址变为 `/en/post/2`，渲染同一篇文章

#### Scenario: 带查询参数时切换语言

- **WHEN** 在 `/post?tag=港中深` 点击切换到英文
- **THEN** 地址变为 `/en/post?tag=港中深`

### Requirement: 正文语言回退不变

界面语言与正文语言仍是两个独立概念。某篇文章缺少当前界面语言的版本时，必须（MUST）回退到该文章可用的正文版本，且该 URL 不得（MUST NOT）被声明为缺失语言的等价页面。

#### Scenario: 英文界面阅读只有中文正文的文章

- **WHEN** 访问 `/en/post/1`，而该文章只有中文正文
- **THEN** 界面文案为英文，正文为中文

#### Scenario: 英文列表仍包含回退文章

- **WHEN** 访问 `/en/post`
- **THEN** 该文章出现在列表中，不被过滤掉

### Requirement: 未知路径在两种语言下都渲染 404

不存在的路径必须（MUST）渲染站内 404 页面，界面语言跟随 URL 前缀。

#### Scenario: 英文前缀下的未知路径

- **WHEN** 访问 `/en/unknown`
- **THEN** 渲染英文界面的 404 页面
