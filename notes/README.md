# asdukw 笔记（文档站）

个人文档站，用 [Starlight](https://starlight.astro.build/)（Astro 文档主题）构建，独立部署在
Cloudflare Pages（项目 `asdukw-notes`），与主站 `asdukw-pages` 互不影响。

## 内容组织

所有内容在 `src/content/docs/`：

```
src/content/docs/
├── index.mdx                 # 首页（splash）
└── notes/                    # 所有笔记
    ├── index.md              # 笔记总览
    └── <系列>/<章>/<讲>.md    # 例：redis/chapter-01/lec-01.md
```

系列 / 章 / 讲直接对应目录层级；左侧 sidebar 由 `astro.config.mjs` 里的
`autogenerate` 自动生成，新增内容不用改配置。写作与目录约定见 `notes/AGENTS.md`。

## 命令

在 `notes/` 目录下执行（用 Bun）：

```bash
bun install
bun run dev      # 本地开发，默认 http://localhost:4321
bun run build    # 静态产物输出到 notes/dist
bun run preview  # 预览构建结果
```

## 在线编辑（Decap CMS）

`/admin/` 是 [Decap CMS](https://decapcms.org) 管理端（源码在 `public/admin/`），
可在浏览器里编辑笔记，保存即直接提交 `master` 触发自动部署，仅限仓库作者账号。

登录复用主站 `asdukw-api` worker 的 `/decap/auth`、`/decap/callback`
（`worker/src/decap.ts`，与评论登录共用同一个 GitHub OAuth App），不需要额外 worker。
启用前需在 GitHub OAuth App 里加一条 redirect URI：
`https://asdukw-api.zhouzongyuu.workers.dev/decap/callback`，并重新部署 worker。

## 部署

独立 Cloudflare Pages 项目 `asdukw-notes`，由仓库根目录
`.github/workflows/deploy-notes.yml` 部署。首次部署前需先在 Cloudflare 创建
Pages 项目（或在 workflow 里让 `wrangler pages deploy` 交互创建，但 CI 里不行），
然后打开 workflow 的 push 触发。
