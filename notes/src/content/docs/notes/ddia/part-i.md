---
title: 第一部分 · 数据系统基础
description: 前五章的地基：架构权衡、非功能性需求、数据模型、存储引擎与数据编码。
---

本书前五章介绍数据系统底层的基础概念，无论单机还是分布式数据系统都适用。

- 第一章讨论*数据系统架构中的利弊权衡*：不同类型的数据系统（如分析型与事务型），以及它们在云环境中的运行方式。
- 第二章定义*非功能性需求*：可靠性、可伸缩性与可维护性到底意味着什么，如何实现这些目标。
- 第三章比较几种*数据模型与查询语言*——从程序员角度看，这是数据库之间最明显的区别，不同模型适用于不同场景。
- 第四章深入*存储引擎*内部，研究数据库如何在磁盘上摆放数据；不同引擎针对不同负载优化，选型对性能影响巨大。
- 第五章比较几种*数据编码*，特别看它们在需求常变、模式需随时间演化的环境中表现如何。

[第二部分](/notes/ddia/part-ii/) 专门讨论分布式数据系统特有的问题。

## 索引

### [1. 数据系统架构中的权衡](/notes/ddia/chapter-01/lec-01/)

- [分析型与事务型系统](/notes/ddia/chapter-01/lec-01/)
- [云服务与自托管](/notes/ddia/chapter-01/lec-02/)
- [分布式与单节点系统](/notes/ddia/chapter-01/lec-03/)
- [数据系统、法律与社会](/notes/ddia/chapter-01/lec-04/)
- [总结](/notes/ddia/chapter-01/lec-05/)

### [2. 定义非功能性需求](/notes/ddia/chapter-02/lec-01/)

- [案例研究：社交网络首页时间线](/notes/ddia/chapter-02/lec-01/)
- [描述性能](/notes/ddia/chapter-02/lec-02/)
- [可靠性与容错](/notes/ddia/chapter-02/lec-03/)
- [可伸缩性](/notes/ddia/chapter-02/lec-04/)
- [可维护性](/notes/ddia/chapter-02/lec-05/)
- [总结](/notes/ddia/chapter-02/lec-06/)

### [3. 数据模型与查询语言](/notes/ddia/chapter-03/lec-01/)

- [关系模型与文档模型](/notes/ddia/chapter-03/lec-01/)
- [图数据模型](/notes/ddia/chapter-03/lec-02/)
- [事件溯源与 CQRS](/notes/ddia/chapter-03/lec-03/)
- [数据框、矩阵与数组](/notes/ddia/chapter-03/lec-04/)
- [总结](/notes/ddia/chapter-03/lec-05/)

### [4. 存储与检索](/notes/ddia/chapter-04/lec-01/)

- [OLTP 系统的存储与索引](/notes/ddia/chapter-04/lec-01/)
- [分析型数据存储](/notes/ddia/chapter-04/lec-02/)
- [多维索引与全文索引](/notes/ddia/chapter-04/lec-03/)
- [总结](/notes/ddia/chapter-04/lec-04/)

### [5. 编码与演化](/notes/ddia/chapter-05/lec-01/)

- [编码数据的格式](/notes/ddia/chapter-05/lec-01/)
- [数据流的模式](/notes/ddia/chapter-05/lec-02/)
- [总结](/notes/ddia/chapter-05/lec-03/)
