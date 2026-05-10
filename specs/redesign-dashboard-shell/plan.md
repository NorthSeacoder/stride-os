# Implementation Plan: 重塑 Dashboard 工作台视觉壳层

**Workspace**: `redesign-dashboard-shell` | **Date**: 2026-05-10 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/redesign-dashboard-shell/spec.md`

---

## Summary

本次改造采用“先壳层、后页面”的方案：先把 `(dashboard)` 路由组升级为统一的工作台 shell 和设计 token，再按 `dashboard -> quadrants -> okr/tasks/review/settings` 顺序重组各页布局。业务服务、数据结构、路由职责保持不变，改动集中在 App Router 布局层、页面容器层和 UI 视觉原子层。

STACK DETECTED:
- Next.js 16.2.4 (from `apps/web/package.json`)
- React 19 / React DOM 19 (from `apps/web/package.json`)
- Tailwind CSS 4 (from `apps/web/package.json`)
- Base UI 1.4.1 (from `apps/web/package.json`)
- dnd-kit core 6.3.1 / sortable 10.0.0 (from `apps/web/package.json`)

---

## Architecture Overview

本次方案只改前端展示层，保持现有服务调用链不变：

1. `apps/web/src/app/(dashboard)/layout.tsx`
   负责承载统一 shell，输出左导航、顶栏、主画布框架，并为所有 dashboard 子页提供共享空间结构。
2. `apps/web/src/app/globals.css`
   负责沉淀新的视觉 token 和基础材质规则，扩展现有深色变量为“石墨底 + 金属面板 + 冷白边线 + 冰蓝强调”的体系。
3. 各页面 `page.tsx` / `*-client.tsx`
   保持既有数据获取和 server action 链路，重组信息布局和容器结构，使其符合新的页面心智。
4. `apps/web/src/components/ui/*`
   在不重写全部原子组件的前提下，补足可复用的 shell/panel/header/metric 类基础容器，或升级现有 Button、Badge、Modal、Empty 等的默认视觉。

数据流保持现状：

- Server Components 继续从 `review-service`、`okr-service`、`task-service` 等读取数据
- Client Components 继续使用 `useActionState`、`useTransition`、dnd-kit 等处理交互
- 本次不新增 API，不新增数据库字段，不改变 server action 签名

---

## Key Design Decisions

### Decision 1: 以 `(dashboard)/layout.tsx` 作为统一工作台 shell 的唯一入口

- **背景**: 六个页面都位于同一 route group 下，现有 `layout.tsx` 仅提供简单顶栏，正好适合做统一升级。
- **选项**:
  - A: 在 `(dashboard)/layout.tsx` 建立统一 shell，并让各页面只负责各自 workspace 内容 — 一致性强，改动边界清楚
  - B: 每个页面各自实现导航和顶部结构 — 灵活，但极易漂移，维护成本高
- **结论**: 选 A。统一 shell 是这次 feature 的核心，必须通过 App Router layout 收口。
- **影响**: 壳层结构、当前导航态、全局标题区、主容器宽度和内边距都可集中治理。
- **来源**: https://nextjs.org/docs/app/getting-started/layouts-and-pages

### Decision 2: 保持“Server Component 取数 + Client Component 交互”的现有页面边界

- **背景**: 现有 `okr/page.tsx`、`quadrants/page.tsx`、`dashboard/page.tsx` 已按 App Router 习惯拆分服务端取数与客户端交互。
- **选项**:
  - A: 维持现有取数边界，只调整布局和视觉组件 — 风险低，和现有代码现实一致
  - B: 借视觉改造顺带重构页面数据边界 — 收益不明确，容易扩大范围
- **结论**: 选 A。本次 feature 聚焦视觉系统，不借机做数据架构重构。
- **影响**: `page.tsx` 仍负责聚合数据，`*-client.tsx` 继续承载交互状态；视觉升级不触碰服务层。
- **来源**: https://nextjs.org/docs/app/getting-started/layouts-and-pages

### Decision 3: 继续沿用 React 19 的 `useActionState` / `useTransition` 模式，不回退到自管提交状态

- **背景**: `tasks-client.tsx`、`review-client.tsx` 已使用 `useActionState`；这与当前 React 版本一致。
- **选项**:
  - A: 延续 `useActionState` / `useTransition` 模式 — 与现有实现和 React 19 官方建议一致
  - B: 回退到 `useState` + 手动 pending/error 管理 — 会让交互层风格分裂
- **结论**: 选 A。视觉重构期间不改变表单和 action 状态管理范式。
- **影响**: 如果新增壳层内的局部交互容器，仍按现有 action 模式接入。
- **来源**: https://react.dev/reference/react/useActionState

### Decision 4: 设计 token 采用“保留现有 `:root` 运行时变量 + 按需引入 Tailwind 4 `@theme`”的渐进方式

- **背景**: 当前样式大量通过 `var(--bg-panel)`、`var(--border-subtle)` 等运行时变量引用；一次性全部改写为新的 utility token 成本高且风险大。
- **选项**:
  - A: 继续以 `:root` 变量为主，先扩展现有 token；如需新 utility，再局部补 `@theme` — 兼容现有代码，迁移成本低
  - B: 立即把设计 token 全量迁移到 Tailwind 4 `@theme` 命名空间 — 理论更整洁，但超出本次 feature 范围
- **结论**: 选 A。先把视觉系统落地，再决定后续是否做 token 全面升级。
- **影响**: 现有类名几乎都可继续工作，新增组件也能直接复用 `var(...)`；后续若要抽公共 utility，不会被这次方案锁死。
- **来源**: https://tailwindcss.com/docs/theme

### Decision 5: 四象限页保留 dnd-kit 交互架构，只升级空间布局和视觉几何感

- **背景**: 当前 `quadrants-client.tsx` 已有可工作的拖拽链路，这与前一个 feature 的交互目标一致。
- **选项**:
  - A: 保留 dnd-kit 拖拽上下文，重做版面与卡片呈现 — 可控且聚焦
  - B: 为了视觉效果更换拖拽/坐标模型 — 收益小，风险大
- **结论**: 选 A。只强化象限盘的中心性和精密仪表感。
- **影响**: 主要变更落在容器布局、Droppable 区域样式、详情区组织方式，不动核心移动逻辑。
- **来源**: UNVERIFIED — 该决策主要来自当前代码现实和范围控制，不依赖框架新能力

---

## Module Design

### Module: Dashboard Shell

**职责**: 为 dashboard 路由组提供统一的空间骨架、导航模型和顶层视觉层次。

**改动概述**: 重写 `apps/web/src/app/(dashboard)/layout.tsx` 的 DOM 结构与样式组织，从“单顶栏”升级为“左导航 + 顶栏 + 主工作区”。

**关键接口 / 行为**:

```text
DashboardLayout
  - 继续校验 session user；未登录仍 redirect('/login')
  - 输出 shell:
    - sidebar: 品牌 + 主导航 + 当前页定位
    - topbar: 用户信息 + 全局状态/辅助入口
    - content frame: 包裹 children 的统一画布容器
  - 导航链接继续使用现有六个页面路由
```

**注意事项**:

- 不改登录态逻辑
- 不引入新的全局状态管理
- 当前页高亮建议基于 pathname/segment，而不是让每页手动传 active 标识

### Module: Visual Tokens and Surface System

**职责**: 定义本次视觉语言所需的颜色、边线、面板、阴影、半透明指示层和布局半径规则。

**改动概述**: 扩展 `apps/web/src/app/globals.css`，增加 shell 级变量和面板层规则，并统一已有组件默认容器风格。

**关键接口 / 行为**:

```text
globals.css
  - 扩展变量:
    --bg-shell
    --bg-sidebar
    --bg-topbar
    --bg-surface-1/2/3
    --border-hairline
    --border-glow
    --accent-ice
    --shadow-panel
    --radius-shell/panel
  - 保留现有 var(--bg-panel) 等变量，避免全站一次性破坏
  - 为常用 panel/header/metric 容器准备可复用 class 模式
```

**注意事项**:

- 新变量应建立明确层级，不要继续平铺堆颜色名
- 优先复用现有变量命名习惯，避免同时存在两套互不映射的深色语义
- 若引入 `@theme`，只用于确实需要生成 utility 的 token

### Module: Shared UI Surfaces

**职责**: 让页面复用统一的面板、标题区、统计卡和辅助提示容器。

**改动概述**: 在 `apps/web/src/components/ui` 现有基础上，新增或组合轻量容器组件，而不是把页面重新写成大段重复 className。

**关键接口 / 行为**:

```text
Possible primitives:
  - ShellSection / SurfacePanel
  - SectionHeader
  - MetricTile
  - AsidePanel
  - PageIntro

Usage:
  - dashboard/review/settings 直接消费这些共享容器
  - tasks/quadrants/okr 在各自 client 组件中局部复用
```

**注意事项**:

- 保持组件数量克制；只抽真正跨页复用的容器
- 不把业务语义塞进通用 UI 组件
- Button、Badge、Modal 若需调视觉，优先改默认风格而非每页覆盖

### Module: Dashboard Overview Page

**职责**: 将现有总览数据重组为更明确的“状态条 + 主进展区 + 摘要区”。

**改动概述**: 保持 `getDashboardSummary()` 不变，重排现有 `SummaryCard`、风险 KR、今日快照、任务分布、最近复盘等模块的层级。

**关键接口 / 行为**:

```text
dashboard/page.tsx
  - 顶部: 状态条/周期条
  - 中部: 重点双列，左偏战略，右偏执行
  - 底部: 摘要带或补充面板
  - 现有空状态继续保留，但样式进入新 surface 系统
```

**注意事项**:

- 现有数据已够支撑改造，不新增接口
- 图表和条形信息保持克制，不引入重型 chart 库

### Module: Quadrants Workspace

**职责**: 把四象限页升级为全站辨识度最高的工作盘，同时保留当前拖拽行为。

**改动概述**: 重构 `quadrants-client.tsx` 页面布局，从“四个等权卡片”升级为“中央象限盘 + 详情/说明侧栏”。

**关键接口 / 行为**:

```text
QuadrantsClient
  - 保留 DndContext、sensors、persistMove
  - 把象限区改为中心主舞台
  - 为 active/selected task 提供常驻详情区或辅助信息区
  - TaskCard 保持可拖拽，但呈现更像仪表盘上的任务片
```

**注意事项**:

- 不破坏键盘传感器和错误回滚
- 数据稀疏时要有稳态空白设计，避免中间象限区显得“没做完”

### Module: OKR / Tasks / Review / Settings Workspaces

**职责**: 在统一 shell 内为每个页面建立符合其心智的布局骨架。

**改动概述**:
- `okr`: 左侧目标列表，右侧目标详情与时间轴
- `tasks`: 顶部过滤条，下方任务流 + 今日执行侧栏
- `review`: 更安静的分析/反思式布局
- `settings`: 分组控制台式布局

**关键接口 / 行为**:

```text
OKR
  - 不动 period/list/check-in 数据流
Tasks
  - 保留 modal/create/edit/action 流程
Review
  - 保留 generate/save/finalize action 链路
Settings
  - 保留现有 account + token 入口，增强层次和分组
```

**注意事项**:

- 这些页面应复用统一容器，但避免视觉上完全同质
- 不把 tasks/review 的交互重构混入本次 feature

---

## Data Model

本次不涉及领域实体、状态机或存储结构变更，因此不单独生成 `data-model.md`。唯一变化是展示层对既有数据的编排方式和视觉表达方式。

---

## Project Structure

```text
apps/web/src/app/
├── [修改] globals.css
├── [修改] (dashboard)/layout.tsx
├── [修改] (dashboard)/dashboard/page.tsx
├── [修改] (dashboard)/okr/page.tsx
├── [修改] (dashboard)/okr/okr-client.tsx
├── [修改] (dashboard)/tasks/tasks-client.tsx
├── [修改] (dashboard)/quadrants/quadrants-client.tsx
├── [修改] (dashboard)/review/review-client.tsx
└── [修改] (dashboard)/settings/page.tsx

apps/web/src/components/ui/
├── [修改] button.tsx
├── [修改] badge.tsx
├── [修改] modal.tsx
├── [可选新增] shell-section.tsx
├── [可选新增] section-header.tsx
├── [可选新增] metric-tile.tsx
└── [修改] index.ts

specs/redesign-dashboard-shell/
├── [已存在] spec.md
└── [新增] plan.md
```

---

## Risks and Tradeoffs

- 视觉升级如果只改 token、不改页面骨架，最终会停留在“换皮”，达不到本次目标。
- 若一开始就同时深改 6 页，回归面太大，建议实现阶段按“壳层 -> 核心页 -> 其余页”推进。
- 当前页面中存在大量内联 className；若不提炼少量共享 surface 容器，后续维护会继续分裂。
- 过度追求材质和高光会侵蚀文字可读性，必须把对比度和信息密度作为硬约束。
- `quadrants` 页若一边做视觉一边改拖拽模型，排错成本会放大，因此本计划明确只改展示骨架。

---

## Verification Strategy

实现后按四层验证：

1. 静态验证
   - `pnpm lint`
   - `pnpm typecheck`

2. 页面级人工验收
   - 检查六个页面是否都进入统一 shell
   - 检查当前页导航高亮、顶栏、主区是否连续
   - 检查深色对比度、面板边界、空状态、长内容页面表现

3. 关键交互回归
   - `tasks`: 新建任务 modal、编辑任务、切换视图
   - `quadrants`: 拖拽移动、错误回滚、空象限展示
   - `review`: 生成草稿、保存草稿、归档定稿入口可见性
   - `settings`: 账户信息与 token 管理入口可访问

4. 视觉一致性检查
   - 对照已确认的出图方向，验证壳层、卡片、标题区、状态条是否属于同一视觉系统
   - 核查 `dashboard` 与 `quadrants` 是否承担主要风格锚点作用

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

- 现有 `dashboard` 数据已经足以支持更强的布局表达，不需要为了“设计感”新增后端聚合。
- 现有 `review-client.tsx` 和 `tasks-client.tsx` 已使用 React 19 action 模式，本次不应逆向回退。
- 当前仓库根有 `docs/plans/2026-05-10-dashboard-visual-prompts.md`，实现阶段可将其作为视觉参照，但它不是实现约束源，约束源仍是本 `spec/plan`。

---

## Sources

| 决策 | 来源 URL | 备注 |
|------|---------|------|
| 统一 shell 放在 App Router layout | https://nextjs.org/docs/app/getting-started/layouts-and-pages | layout 适合共享 UI |
| 保持现有 App Router 页面边界 | https://nextjs.org/docs/app/getting-started/layouts-and-pages | page/layout 角色边界 |
| 继续使用 `useActionState` | https://react.dev/reference/react/useActionState | React 19 action 状态模式 |
| token 渐进演进策略参考 | https://tailwindcss.com/docs/theme | `@theme` 与 `:root` 的边界 |
| 四象限保留 dnd-kit 架构 | UNVERIFIED | 基于当前代码现实和范围控制 |
