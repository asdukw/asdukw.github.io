---
title: 笔记总览
description: 所有系列笔记的入口。
---

这里按系列汇总笔记。

## 系列

- [Redis 笔记](/notes/redis/)——从入门到缓存实战，先逐个讲数据类型，再谈选型与工程实践。
- [RocketMQ 笔记](/notes/rocketmq/)——从架构与存储讲到事务消息与消费模型，先弄清一条消息怎么落盘、怎么被路由。

新增一个系列的内容目录约定是：

```
src/content/docs/notes/<系列>/<章>/<讲>.md
```

目录放好之后，还要在 `astro.config.mjs` 的 `sidebar` 里加一个顶层分组（「概览」指向
`/notes/<系列>/`，各章用 `autogenerate`），否则侧栏里不会出现。侧栏只显示当前系列，
其他系列收在底部「其他系列」入口。
