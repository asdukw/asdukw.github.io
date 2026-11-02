# Proposal

## Why

文章页顶部有一条 `fixed inset-x-0 top-0 z-50 h-0.5` 的品牌色进度条，滚动时紧贴在 sticky header 的上沿。它对读者不承载任何信息（`aria-hidden`、纯装饰，且只以文章元素为基准，不反映真实阅读状态），却和外层 header 的 1px 下边框在同一条视觉线上抢注意力——看起来像 header 下面多了一条未对齐的蓝线。

## What Changes

- 删除 `src/components/blog/ReadingProgress.tsx`。
- 从 `src/pages/PostDetailPage.tsx` 移除它的导入与渲染，并一并移除只为它存在的 `articleRef`（`useRef` 只用于把文章元素传给进度条）。
- 更新 `docs/ARCHITECTURE.md` 里 `blog/` 组件清单中的「进度条」。

不在范围内：`src/components/ui/` 里的 shadcn `Progress` 组件（`docs/COMPONENTS.md` 里那条）与本条无关，保留；评论区的任何元素不动。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

（无）

理由：现有能力只有 `i18n-routing` 与 `seo-artifacts`，两者都不覆盖文章页的装饰性 UI。删除一个未被任何 spec 声明的元素不改变任何已声明契约，为它新造一个只有一条否定式需求的能力（「文章页不得显示阅读进度条」）是凭空发明需求。因此本 change 在 `.openspec.yaml` 里声明 `skip_specs: true`。

## Impact

- **代码**：`src/pages/PostDetailPage.tsx`（约 3 行）、删除 `src/components/blog/ReadingProgress.tsx`。无其他引用（已用 `rg` 确认全仓只有这一处使用）。
- **行为**：仅视觉。该组件原本用 `aria-hidden` 隐藏，不存在无障碍信息损失；移除后同时少掉一个 `scroll` / `resize` 监听与一个 `requestAnimationFrame` 循环。
- **依赖 / 构建 / Worker / URL**：均不涉及。预渲染产物不受影响（该组件在滚动前渲染出的进度为 0）。
- **文档**：`docs/ARCHITECTURE.md` 一处组件清单。
