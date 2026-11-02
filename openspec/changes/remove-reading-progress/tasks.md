# Tasks

## 1. 移除进度条

- [x] 1.1 从 `src/pages/PostDetailPage.tsx` 删掉 `ReadingProgress` 的导入与 `{<ReadingProgress target={articleRef} />}` 渲染，并移除只为它存在的 `articleRef`（`useRef` 与 `ref={articleRef}`）；验证：`rg -n "articleRef|ReadingProgress" src` 无结果，`bun run typecheck` 与 `bun run lint` 均通过（lint 0 error）。
- [x] 1.2 删除 `src/components/blog/ReadingProgress.tsx`；验证：文件不存在，且 `rg -n "ReadingProgress" . --glob '!node_modules' --glob '!dist'` 只剩 `openspec/` 下的历史记录。
- [x] 1.3 更新 `docs/ARCHITECTURE.md` 里 `blog/` 组件清单，去掉「进度条」；验证：文档的组件列表与 `ls src/components/blog` 实际文件一致。
- [x] 1.4 跑一遍完整链路确认没有连带破坏：`bun run build:content && bun run typecheck && bun run typecheck:worker && bun run lint && bun run smoke && bun run build`；验证：全部通过，且 `bun run build` 后 `dist/post/2.html` 里不再出现 `z-50 h-0.5` 的进度条容器。

## Workflow follow-up

- 归档该 change 用 `/openspec-archive-change`；它声明了 `skip_specs: true`，归档时不会有 spec 需要同步。
