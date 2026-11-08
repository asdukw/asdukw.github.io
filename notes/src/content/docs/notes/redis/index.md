---
title: Redis 笔记
description: 从零梳理 Redis：先把数据类型逐个讲透，再谈选型，最后进入持久化、高可用与缓存实战。
sidebar:
  label: Redis 笔记
  order: 1
---

这个系列把 Redis 从「会敲几个命令」梳理到「能按业务选型、能定位线上问题」。

## 为什么这样排序

整体是**先横向铺开、再纵向深入**：

1. **先打基础**——搞清 Redis 是什么、为什么快、key 空间怎么管，后面所有内容都建立在这层直觉上。
2. **再逐个过数据类型**——按官方文档的顺序把 14 种类型讲完（从 Strings 到 Vector sets），重点是每种类型的定位、命令、底层编码和坑。顺序跟官方一致，方便随时对照原文。
3. **然后才讲选型**——等所有类型都见过，再回头做「数据类型怎么选」的决策树和内存成本对比。顺序反过来的话，选型只能背结论，记不住理由。
4. **最后进入工程**——持久化、高可用与集群、缓存三大问题、运维与性能调优。

## 目录规划

> 下面是计划中的章节结构，随写作推进逐步补全；写好的讲会在对应位置补上链接。
> 第二章（数据类型）已按官方顺序写完，其余章节待续。

### 第一章 · 入门

- Redis 是什么，为什么快（单线程模型、内存存储、I/O 多路复用）
- 安装、启动与 `redis-cli`、配置文件速览
- Key 空间与基础命令（`SCAN`、`TTL`、`EXPIRE`、`TYPE`、`OBJECT ENCODING`）

### 第二章 · 数据类型（逐个讲）

顺序与 [Redis 官方文档的数据类型目录](https://redis.io/docs/latest/develop/data-types/)一致，方便对照原文；每篇的小节结构也沿用官方页面的 h2，只做翻译与总结。

- [2.1 Strings：最基础的字节串](/notes/redis/chapter-02/lec-01/)——字节序列、SET 选项、原子计数器、512 MB 上限
- [2.2 Bitmaps：按位存储的紧凑位图](/notes/redis/chapter-02/lec-02/)——SETBIT/GETBIT、BITCOUNT，签到与 UV 去重
- [2.3 Bitfields：在一个字符串里打包多个整数](/notes/redis/chapter-02/lec-03/)——任意位宽与偏移的整数读写
- [2.4 Arrays：可索引的可变长序列](/notes/redis/chapter-02/lec-04/)——按下标读写、环形缓冲、聚合与搜索
- [2.5 Geospatial：地理位置与半径查询](/notes/redis/chapter-02/lec-05/)——底层是 sorted set 的地理编码
- [2.6 Hashes：字段级读写的小对象](/notes/redis/chapter-02/lec-06/)——字段级过期、listpack 紧凑编码
- [2.7 JSON：原生嵌套文档](/notes/redis/chapter-02/lec-07/)——按路径读写，模块能力
- [2.8 Lists：双端队列与阻塞读取](/notes/redis/chapter-02/lec-08/)——队列 / 栈 / 消息列表，BLPOP 语义
- [2.9 Probabilistic：概率型数据结构](/notes/redis/chapter-02/lec-09/)——HyperLogLog、Bloom、Cuckoo、CMS、t-digest、Top-K
- [2.10 Sets：去重集合与集合运算](/notes/redis/chapter-02/lec-10/)——交并差、随机抽样
- [2.11 Sorted sets：带分数的有序集合](/notes/redis/chapter-02/lec-11/)——区间与字典序查询、排行榜
- [2.12 Streams：日志式追加与消费者组](/notes/redis/chapter-02/lec-12/)——entry ID、XREAD、PEL 与认领
- [2.13 Time series：时间戳序列与聚合](/notes/redis/chapter-02/lec-13/)——retention、降采样、NaN 语义
- [2.14 Vector sets：向量相似度检索](/notes/redis/chapter-02/lec-14/)——FP32 存储、相似度查询

### 第三章 · 数据类型选型

讲完所有类型之后再来回答「这次该用哪个」：

- 选型决策树：文档类 / 集合类 / 序列类三条问题链
- 内存成本阶梯与底层编码（`int` / `embstr` / `listpack` / `hashtable` 等）
- 专用类型 vs 通用类型的边界，以及「用 string 模拟一切」的真实代价

### 第四章 · 进阶能力

- 事务（`MULTI` / `EXEC`）与 Lua 脚本
- Pipeline 与批量操作
- 发布订阅
- 过期与内存淘汰策略

### 第五章 · 持久化

- RDB、AOF、混合持久化，以及各自的取舍

### 第六章 · 高可用与集群

- 主从复制、Sentinel、Redis Cluster 的职责与边界

### 第七章 · 缓存实战

- 缓存穿透 / 击穿 / 雪崩
- 缓存与数据库的一致性
- 大 key、热 key 的识别与治理

### 第八章 · 运维与性能

- 慢查询日志、内存分析、监控指标与常见故障排查

## 阅读建议

- 没接触过 Redis 的，按顺序从第一章读起。
- 已经有基础、只想补某块内容的，可以直接跳章节；但**第三章选型建议等第二章读完再看**，否则容易知其然不知其所以然。
- 每讲尽量配可复现的命令，边看边在本地 `redis-cli` 敲一遍效果最好。
