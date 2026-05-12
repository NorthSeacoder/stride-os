# Implementation Plan: 桌面高密度任务工作台与全局壳层重构

**Workspace**: `desktop-task-workspace-shell` | **Date**: 2026-05-12 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/desktop-task-workspace-shell/spec.md`

---

## Summary

本次重构采用 `App-shell first` 路径：先把 dashboard 共享壳层从“品牌化包裹容器”收紧成桌面应用式高密度框架，再把任务页挂接到新壳层上，改造成“来源栏 + 主列表 + 条件详情”的任务操作台。核心收益不是换皮，而是通过减少外层留白、移除低频展示模块、压缩任务项密度，把横向和纵向空间还给高频任务操作。

---

## Architecture Overview

当前结构分两层：

- `apps/web/src/app/(dashboard)/layout.tsx` 负责登录态校验、外层容器 padding、主内容区滚动容器。
- `apps/web/src/app/(dashboard)/dashboard-shell-sidebar.tsx` 负责左侧导航、品牌说明、用户卡片和收展状态。
- `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx` 负责任务页全部客户端状态，包括来源切换、选中任务、弹窗、任务分组和详情栏。

本次方案维持这三个边界，但重写它们的职责分配：

1. `dashboard layout` 继续作为 Server Component，只负责认证和共享骨架挂载，不承载交互状态。
2. `dashboard shell sidebar` 保持 Client Component，仅承载导航收展和当前路由高亮；移除品牌说明、用户卡片等低频展示。
3. `tasks-client` 继续作为 Client Component，但把页面骨架从“常驻三栏”改成“默认两栏 + 条件详情”，并把任务行从卡片式压缩为行式列表。

数据流不变：

- 服务端 `page.tsx` 继续聚合 `sources / sourceGroups / initialTaskDetail / keyResults`。
- 客户端基于 `selectedSourceId` 和 `selectedTaskId` 维护当前视图。
- 任务完成、创建、编辑、创建清单仍通过现有 actions 提交。

变化点在于视图状态：

- `selectedTaskId === null` 时，详情面板不渲染占位列。
- `selectedTaskId !== null` 时，详情面板插入主布局并展示选中任务。
- 任务列表默认尽量吃满主区宽度，详情只在需要时付出空间成本。

---

## Stack Detected

- Next.js `^16` (from `apps/web/package.json`)
- React `^19` (from `apps/web/package.json`)
- React DOM `^19` (from `apps/web/package.json`)
- Tailwind CSS `^4` (from `apps/web/package.json`)
- `@tanstack/react-form` `^1.32.0` (from `apps/web/package.json`)

---

## Key Design Decisions

### Decision 1: 保持 `(dashboard)/layout.tsx` 为 Server Component，只把可交互壳层下沉到子组件

- **背景**: 全局壳层需要认证后的用户信息，同时导航收展依赖 `localStorage` 和点击事件。
- **选项**:
  - A: 让整个 `(dashboard)/layout.tsx` 改成 Client Component — 能直接管理收展状态，但会把认证后壳层整体推入客户端边界。
  - B: 保持 `(dashboard)/layout.tsx` 为 Server Component，仅把交互导航放进 Client Component — 服务端继续负责认证与骨架，客户端只承载交互状态。
- **结论**: 选 B。当前结构已经符合 App Router 的推荐分层，本次只收紧骨架和交互职责，不扩大客户端边界。
- **影响**: 登录校验和服务端渲染路径保持稳定；导航收展与本地持久化继续由 `dashboard-shell-sidebar.tsx` 管理。
- **来源**: https://nextjs.org/docs/app/getting-started/server-and-client-components

### Decision 2: 任务详情使用条件渲染的右侧面板，而不是常驻空列

- **背景**: 用户明确要求“只有选中任务时才展开详情”，目标是把空间优先留给主列表。
- **选项**:
  - A: 保持三列 grid，只在未选中时显示空态详情 — 结构简单，但仍然长期浪费一整列宽度。
  - B: 主布局默认两栏，选中任务后再插入右侧详情面板 — 更符合操作优先，但需要处理列宽回流和选中态同步。
- **结论**: 选 B。这样才能真正解决“真正可操作空间只有一点点”的根问题。
- **影响**: `tasks-client.tsx` 的栅格结构将改成条件列；选中状态不再只决定内容，也决定布局宽度。
- **来源**: UNVERIFIED — 这是产品交互决策，不依赖框架特定 API

### Decision 3: 任务页保留客户端工作区组件，而不是拆成多个跨边界小组件

- **背景**: 当前任务页有来源切换、乐观完成、弹窗开关、选中态和详情联动，全部高度耦合。
- **选项**:
  - A: 继续用单个 `TasksClient` 承载页面级工作区状态，再在内部提取纯视图子组件 — 风险可控，改动集中。
  - B: 强行把来源栏、列表、详情栏拆成多个独立客户端入口 — 结构更细，但会增加 props 和共享状态编排复杂度。
- **结论**: 选 A。先把布局和密度问题解决，再视需要做后续内聚性拆分。
- **影响**: 本次仍以 `TasksClient` 为主改动面，可能提取 `TaskSourceRail`、`TaskListPane`、`TaskDetailPane`、`TaskRow` 等同文件内或同目录组件，但不改变服务端数据聚合边界。
- **来源**: https://nextjs.org/docs/app/getting-started/server-and-client-components

### Decision 4: 导航收展状态继续放在共享 layout 下的 Client 组件中，依赖 layout 保持交互状态

- **背景**: 全局导航收展属于跨 dashboard 子页共享的 UI 状态，用户预期页面切换后仍保持。
- **选项**:
  - A: 把收展状态放进每个页面局部组件 — 简单，但页面切换时状态容易丢失或重复初始化。
  - B: 把状态放在共享 layout 下的壳层 Client 组件中 — 更符合共享壳层语义，切页时更稳定。
- **结论**: 选 B。当前 `DashboardShellSidebar` 已在共享 layout 下，直接复用这一模式。
- **影响**: 不新增全局 store；依赖 App Router 布局持久性和本地存储共同保持收展体验。
- **来源**: https://nextjs.org/docs/app/building-your-application/routing/defining-routes

---

## Module Design

### Module: `apps/web/src/app/(dashboard)/layout.tsx`

**职责**: 提供 dashboard 共享骨架、登录校验和主区滚动容器。

**改动概述**:

- 压缩外层 `px/py` 留白，弱化“浮在页面中的大圆角面板”观感。
- 调整主区内边距，使页面内容更贴边。
- 保持服务端认证与 `DashboardShellSidebar` 组合关系不变。

**关键接口 / 行为**:

```text
DashboardLayout
  -> getSessionUser()
  -> render shared shell container
  -> mount DashboardShellSidebar(user)
       -> render main scroll area as children slot
```

**注意事项**:

- 不能破坏 `overflow-hidden` + 内层独立滚动的现有行为。
- 主区 padding 压缩要和任务页局部 pane padding 一起设计，避免双重留白。

### Module: `apps/web/src/app/(dashboard)/dashboard-shell-sidebar.tsx`

**职责**: 承载全局导航、导航收展状态、本地持久化与当前路由高亮。

**改动概述**:

- 从“内容型 sidebar”改成“工具型导航栏”。
- 删除品牌标题、说明文字、用户卡片、重复退出入口。
- 保留必要导航项、收展按钮、可能的最小账户/退出入口。
- 收起态重点优化为稳定的窄图标栏。

**关键接口 / 行为**:

```text
state: collapsed (from localStorage fallback false)
action: toggleCollapsed()
render:
  aside toolbar
  nav items
  optional minimal footer action
  children main area
```

**注意事项**:

- 收起态的当前路由高亮必须比展开态更强，否则图标导航会失去语义。
- 删除低频信息后，要补足垂直节奏，避免 sidebar 显得空。

### Module: `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`

**职责**: 承载任务工作区状态、任务页交互和布局联动。

**改动概述**:

- 去掉 `PageIntro`，改成列表内工具条。
- 把固定三列 grid 改成：
  - 左：来源栏，固定窄宽
  - 中：主列表，默认最大宽度
  - 右：详情面板，仅在 `selectedTask` 存在时渲染
- 任务项由卡片式 `article` 改成紧凑行。
- 保留现有 modal、action、分组逻辑和选中逻辑。

**关键接口 / 行为**:

```text
state:
  selectedSourceId
  selectedTaskId
  taskModal
  sourceGroupsState

derived:
  selectedSource
  groups
  allTasks
  selectedTask
  detailOpen = Boolean(selectedTask)

layout:
  source rail
  task list pane
  if detailOpen -> detail pane

events:
  source click -> update selectedSourceId, clear invalid selectedTaskId
  task row click -> setSelectedTaskId(task.id)
  detail close / invalid source change -> setSelectedTaskId(null or replacement)
  checkbox click -> toggle completion + regroup
```

**注意事项**:

- `selectedTaskId` 当前兼具“详情打开”和“选中态”语义，本次可以继续复用，不需要再引入单独 `detailOpen` 状态。
- 任务行压缩后，`编辑` 按钮、badge、due date 的布局需要重新排布，不能继续占据一整块横向空间。
- “新建任务”入口需要从页面首屏按钮迁移到列表工具条，避免丢失。

### Module: `apps/web/src/app/globals.css`

**职责**: 承载全局视觉变量、壳层表面和滚动条样式。

**改动概述**:

- 对 `.app-shell-panel`、`.app-shell-grid`、共享 radius / shadow / background 规则做收敛。
- 为高密度壳层调整圆角、背景层级和视觉包裹感。
- 如有必要，补充更适合任务行的共享工具类或 token。

**关键接口 / 行为**:

```text
:root tokens
.app-shell-panel
.app-shell-grid
.dashboard-main-scroll
optional compact shell / row helpers
```

**注意事项**:

- 这是全局文件，任何 token 变化都会影响 dashboard / okr / quadrants / review / settings。
- 本次不做全面视觉返工，但要确保其他页面在新 shell 下不破版。

---

## Data Model

本次不涉及新的领域实体，也不改变任务、清单、重复定义的业务语义，因此不需要新增 `data-model.md`。任务来源、任务完成逻辑和重复任务配置沿用现有模型；主要变化发生在 UI 壳层结构、视图状态和任务呈现密度。

---

## Project Structure

```text
specs/desktop-task-workspace-shell/
├── [已新增] spec.md
└── [新增] plan.md

apps/web/src/app/
├── [修改] (dashboard)/layout.tsx
├── [修改] (dashboard)/dashboard-shell-sidebar.tsx
├── [修改] (dashboard)/tasks/tasks-client.tsx
└── [可能修改] globals.css

apps/web/src/components/ui/
└── [可能复用] button.tsx, badge.tsx, empty.tsx, modal.tsx
```

---

## Risks and Tradeoffs

- `globals.css` 与壳层 token 改动是全局性的，可能导致其他 dashboard 页面视觉节奏变化，需要最少量回归检查。
- `tasks-client.tsx` 已较大，本次继续在同文件中大改会增加局部复杂度；但相比强行拆分跨边界组件，当前阶段风险更低。
- 从卡片式切到行式后，若 spacing 压得过狠，可能伤害可点击性和信息辨识度，需要在实现时保留最小点击目标。
- 详情按需展开会改变主列表宽度，若过渡处理不好，容易出现布局跳动感；应优先保证结构稳定，而不是追求复杂动画。

---

## Verification Strategy

- 运行 `pnpm lint`
- 运行 `pnpm typecheck`
- 如任务页相关测试受影响，运行 `pnpm test`
- 手动验证 dashboard 内至少以下页面：
  - `/tasks`: 默认两栏、选中后展开详情、取消后回流、任务行紧凑化、导航收展正常
  - `/dashboard` 或 `/settings`: 确认新 shell 未造成明显破版
- 手动验证导航收展状态的本地持久化与路由切换后的保持行为

---

## Design Artifacts

本次计划涉及的产物：

| 产物 | 是否需要 | 说明 |
|------|---------|------|
| plan.md | 必须 | 主实现计划 |
| data-model.md | 不需要 | 本次不涉及实体或存储结构变化 |
| tasks.md | 后续阶段生成 | 由 `tasks` 阶段产出 |
| acceptance.md | 后续阶段生成 | 用于最终验收结论 |

---

## Notes

- 本次明确是桌面优先工作台重构，不承担移动端和平板端适配质量目标。
- 旧 `task-workspace-redesign` 保留作为历史方案，不复用，不应与本次 feature 混淆。
- 任务页既有的创建/编辑/重复任务能力不在本次削减范围内；即使布局收紧，也要保留这些入口和流程。

---

## Sources

| 决策 | 来源 URL | 备注 |
|------|---------|------|
| 保持 dashboard layout 为 Server Component，仅把交互下沉 | https://nextjs.org/docs/app/getting-started/server-and-client-components | App Router 下 layout/page 默认是 Server Components；交互与 localStorage 放 Client Components |
| 共享导航状态放在 layout 下的壳层组件 | https://nextjs.org/docs/app/building-your-application/routing/defining-routes | layout 在导航间共享并保持交互性 |
| 条件详情面板替代常驻空列 | UNVERIFIED | 产品交互决策 |
