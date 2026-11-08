---
title: 3.2 图数据模型
description: 多对多关系无处不在时，属性图与三元组存储怎么建模，Cypher、SPARQL、SQL 递归、Datalog 与 GraphQL 各自的表达力。
sidebar:
  order: 2
---

如果应用里的关系大多是一对多，文档模型就够用；但若多对多关系普遍、连接越来越复杂，把数据建模成图更自然。

图由*顶点*（vertex，也叫节点）和*边*（edge，也叫关系）组成。社交图的顶点是人、边是谁认识谁；网页图的顶点是页面、边是链接；路网的顶点是交叉口、边是路段。图上可以跑最短路径、PageRank 这类算法。表示方式有两种：*邻接表*（adjacency list）给每个顶点存相邻顶点 ID，适合遍历；*邻接矩阵*（adjacency matrix）行列各对应一个顶点、有边为 1，适合机器学习。图也不必同质：Facebook 的图里顶点有人、地点、事件、签到、评论，边有好友、签到于、评论、参加。

本节讲*属性图*（property graph）与*三元组存储*（triple store），四种查询语言 Cypher、SPARQL、Datalog、GraphQL，以及 SQL 的图查询支持；例子是一对夫妻：生于爱达荷州的 Lucy 与生于法国圣洛的 Alain。

## 属性图

属性图（也叫带标签属性图）里，每个顶点有唯一标识符、描述对象类型的标签、出边集、入边集、属性集；每条边有唯一标识符、尾顶点（tail vertex）、头顶点（head vertex）、描述关系类型的标签、属性集。

它可以原样存成两张关系表：`vertices` 与 `edges`，属性放 `jsonb`。按 `head_vertex` 或 `tail_vertex` 查询就得到入边或出边，两列都要建索引。要点有三：任意顶点都能连到任意顶点，没有模式规定什么能关联什么；给定顶点能高效双向*遍历*（traverse）；打不同标签，就能在一张图里存多种信息而不失清晰。边表本质是关联表的泛化，同一张表可装许多类型的关系。局限是一条边只能连两个顶点，而关联表一行可以放多个外键，表示三元甚至更高元的关系——图里要为每行另建顶点再连边，或者用*超图*（hypergraph）。

这种灵活性适合表达关系模式别扭的东西：各国行政区划不同、有国中之国这类历史遗留、粒度也不统一（现居地到城市，出生地只到州）；加过敏信息也只需新增顶点与边。

## Cypher 查询语言

Cypher 是属性图的查询语言，最初为 Neo4j 而创，后以 openCypher 成为开放标准，若干图库都支持。创建数据用箭头记法：`(idaho)-[:WITHIN]->(usa)` 生成一条以 `idaho` 为尾、`usa` 为头的边，括号里的符号名只在查询内部有效，不存进数据库。

查询同样用箭头记法匹配模式，要找出从美国移居欧洲的人：

```
MATCH
  (person)-[:BORN_IN]->()-[:WITHIN*0..]->(:Location {name:'United States'}),
  (person)-[:LIVES_IN]->()-[:WITHIN*0..]->(:Location {name:'Europe'})
RETURN person.name
```

读作：找同时满足两个条件的 `person`——一条 `BORN_IN` 出边，再沿零或多条 `WITHIN` 出边到达美国；另一条 `LIVES_IN` 出边，同样到达欧洲。`WITHIN*0..` 就是"走零次或多次"，类似正则的 `*`，用来跨越不定层数的地点关系。实现上可以扫所有人逐一验证，也可以从美国和欧洲两个顶点反向沿 `WITHIN` 铺开。

## SQL 中的图查询

图数据可以放进关系表，问题是用 SQL 查得顺不顺。每遍历一条边就是与 `edges` 表连接一次；关系查询通常事先知道要几次连接，图查询在找到目标顶点前要走多少跳却不确定。

SQL:1999 起可以用*递归公用表表达式*（recursive common table expression，`WITH RECURSIVE`）表达变长路径。同一个查询要写四段递归：从美国顶点沿 `within` 入边扩张出 `in_usa`，对欧洲同样得到 `in_europe`，再沿 `born_in`、`lives_in` 求出两类人，最后求交。Cypher 四行，SQL 三十来行，还没算处理环、选广度还是深度优先。Oracle 另有*层次查询*（hierarchical query）扩展；SQL 标准计划引入借鉴 Cypher 的 GQL。

## 三元组存储与 SPARQL

三元组存储与属性图表达力相当，只是换了词汇：所有信息都写成（*主语*，*谓语*，*宾语*）三部分。主语相当于顶点；宾语若是字面量，谓语就是属性的键，若是另一个顶点，谓语就是边的标签。这类系统还会多存元数据（如 Neptune 的四元组加图 ID），主谓宾结构不变。

编码常用 Turtle（Notation3 的子集）：`_:lucy :bornIn _:idaho`，`_:` 前缀只用于区分哪些三元组指向同一个顶点；同一主语的多条陈述可用分号连写。

RDF 为互联网范围的数据交换设计，主谓宾通常是带命名空间的 URI，这样不同来源的数据合并时不会因同名冲突；那些 URI 不一定能解析，示例里用 `urn:example:` 前缀。

SPARQL 是面向 RDF 的查询语言，早于 Cypher，后者借鉴了它的模式匹配，所以两者形似：

```
SELECT ?personName WHERE {
 ?person :name ?personName.
 ?person :bornIn / :within* / :name "United States".
 ?person :livesIn / :within* / :name "Europe".
}
```

`?person :bornIn / :within* / :name "United States"` 等价于 Cypher 的 `(person)-[:BORN_IN]->()-[:WITHIN*0..]->()`。RDF 不区分属性与边，都算谓语，匹配属性也用同一套语法。三元组的一部分研究来自*语义网*（Semantic Web），那个设想没成功，却留下 JSON-LD、生物医学本体、Open Graph、schema.org 与 Wikidata；三元组本身也成了不错的应用内部模型。

## Datalog：递归关系查询

Datalog 比 SPARQL 和 Cypher 更老，源自 80 年代学术研究，主流数据库很少支持，但表达力强、尤其擅长递归。它基于关系模型而非图模型，放在这里是因为擅长遍历图。

数据库由*事实*（fact）组成，每条事实相当于关系表的一行：`location(2, "United States", "country")` 表示 `location` 表有这一行；边则写成两列关系，如 `born_in(100, 3)`。

规则用 `:-` 定义*派生表*（虚拟表）：左边是表名与列，右边是必须同时匹配的一组模式。规则可以引用自身，这就是递归——`within_recursive(LocID, PlaceName) :- within(LocID, ViaID), within_recursive(ViaID, PlaceName)` 反复应用就能推出某地属于北美；再用一条规则组合出出生地与居住地，最后用 `us_to_europe(Person) :- migrated(Person, "United States", "Europe")` 取结果。派生表类似 SQL 视图，不落盘却可查询。Datalog 要求另一种思维方式：像拆函数一样逐条搭规则，递归由自引用自然得到，而不是写显式循环。

## GraphQL

GraphQL 也是查询语言，但限制更多。它让运行在用户设备上的客户端请求一份结构精确的 JSON——恰好是渲染界面需要的字段，改客户端查询即可，不必改服务端 API。

代价是组织通常要一套工具，把查询翻译成对内部服务的 REST 或 gRPC 调用（第 5 章），还要处理授权、限流和性能。更关键的是查询来自不受信任的客户端，语言因此被刻意收窄：不允许递归（Cypher、SPARQL、SQL、Datalog 都允许），也不能随意提出"出生在美国、现居欧洲"这类条件，除非服务方显式开放，否则大量昂贵查询就能变成拒绝服务攻击。

群聊应用的例子：请求可访问的所有频道，每个频道取名称与最近 50 条消息，每条消息取时间戳、正文、发送者姓名与头像；若是对另一条消息的回复，还要取原消息正文与发送者姓名，供界面以小字显示上下文。响应结构与查询一一对应，不多不少；后来要显示回复者头像，客户端在查询里加一个字段就行。

响应里发送者信息在每条消息中重复，`replyTo` 也复制内容而不是只给 ID——后者若不在最近 50 条里，客户端还得再请求一次，GraphQL 用更大的响应换客户端处理简单。服务端仍可规范化存储、查询时再连接，客户端只能要求模式里开放的连接。名字带 graph，但它可以建在任何数据库上。
