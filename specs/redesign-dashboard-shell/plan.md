# Implementation Plan: 重塑 Dashboard 工作台视觉壳层

**Workspace**: `redesign-dashboard-shell` | **Date**: 2026-05-11 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/redesign-dashboard-shell/spec.md`

---

## Summary

本次方案从“纯视觉壳层改造”升级为“壳层重构 + 组件治理 + dashboard 图表收敛”的组合方案。实现顺序仍然遵循“先壳层、后组件、再页面”，但组件层明确以 `shadcn` 作为管理/分发入口，承接基于 `Base UI` 的 primitives，并在 dashboard 首批引入统一 chart、date picker 与更成体系的表单方案。

STACK DETECTED:
- Next.js 16.2.4 (from `apps/web/package.json`)
- React 19 / React DOM 19 (from `apps/web/package.json`)
- Tailwind CSS 4 (from `apps/web/package.json`)
- Base UI 1.4.1 (from `apps/web/package.json`)
- react-day-picker 9.11.1 (from `apps/web/package.json`)
- dnd-kit core 6.3.1 / sortable 10.0.0 (from `apps/web/package.json`)

---

## Architecture Overview

本次改动仍然只触达前端展示层和交互层，不修改服务签名、数据库结构或页面路由职责，但前端内部边界会更明确：

1. `apps/web/src/app/(dashboard)/layout.tsx`
   负责统一 dashboard shell，收口侧边栏、登录用户控制区、主内容滚动边界和固定信息层。
2. `apps/web/src/app/globals.css`
   负责视觉 token 扩展，以及 Tailwind CSS 变量类名的规范化收敛。
3. `apps/web/src/components/ui/*`
   继续作为首轮 UI 落点，但组织方式切到 `shadcn` 风格：由 `shadcn` 管理组件模板与依赖编排，具体行为层优先复用 `Base UI`。
4. `apps/web/src/app/(dashboard)/*`
   页面继续保留现有 server data -> client interaction 边界，但重写壳层接入、图表表达、设置页导航和表单容器。
5. `apps/web/src/lib/services/review-service.ts`
   保持现有 `getDashboardSummary()` 聚合口不变；必要时只做展示友好的轻量聚合补充，不扩业务边界。

数据流原则保持现状：

- Server Components 继续从 `review-service`、`okr-service`、`task-service` 取数
- Server Actions 继续作为写路径
- 客户端交互在 React 19 下继续依赖 `useActionState` / `startTransition`
- 更复杂的客户端字段状态才引入 `@tanstack/react-form`，而不是全站表单一刀切替换

---

## Key Design Decisions

### Decision 1: 统一 shell 仍然由 `(dashboard)/layout.tsx` 收口，但固定信息必须从顶部挪回侧边栏控制区

- **背景**: 当前 layout 已经是六个 dashboard 页面共享入口，但顶栏内存在重复的 `Operations Shell / Dashboard Workspace / 已登录 / 退出登录` 信息，挤压主操作区，且长页面滚动时壳层定位差。
- **选项**:
  - A: 继续让 layout 承担 shell，同时把账户信息和退出操作收敛到侧边栏，主区单独滚动 — 与 spec 一致，改动边界清楚
  - B: 保留现有顶栏信息结构，只做轻微样式调整 — 改动小，但无法解决信息重复和滚动体验问题
- **结论**: 选 A。layout 负责统一壳层，但固定壳层信息必须最小化、稳定化。
- **影响**: `layout.tsx`、导航组件、主区容器和 settings 的整体空间分配都要调整。
- **来源**: https://nextjs.org/docs/app/getting-started/layouts-and-pages

### Decision 2: `shadcn` 作为共享组件层的管理入口，`Base UI` 作为交互 primitive 的优先实现基础

- **背景**: 现有仓库已在 `apps/web/src/components/ui` 内维护 Base UI 包装层，但分发和管理是手工模式；spec 已明确要“用 `shadcn` 管理基于 Base UI 的能力”。
- **选项**:
  - A: 继续手工维护 `apps/web/src/components/ui`，只参考 `shadcn` 写法 — 成本低，但无法形成稳定的组件治理入口
  - B: 用 `shadcn` 作为组件管理/模板分发方式，首轮仍把组件落在 `apps/web/src/components/ui`，并让行为层优先复用 Base UI — 兼顾治理与现实
  - C: 立即迁移到 `packages/ui` 并全面包级共享 — 长期更整洁，但当前 `packages/ui` 为空，且 web 仍无真实消费链路
- **结论**: 选 B。首轮不迁移到 `packages/ui`，继续以 `apps/web/src/components/ui` 为落点，但安装/生成/维护方式切到 `shadcn` 导向。
- **影响**: 需要补 `components.json`、评估 `pnpm dlx skills add shadcn/ui` 与 `pnpm dlx shadcn@latest add ...` 的前置流程，并重组现有 UI 文件的来源和职责。
- **来源**: https://ui.shadcn.com/llms.txt

### Decision 3: 表单状态管理采用“双轨制”而不是全量替换，保留 `useActionState` 写路径，引入 `@tanstack/react-form` 处理复杂客户端字段状态

- **背景**: 当前 `tasks-client.tsx`、`review-client.tsx`、`tokens-client.tsx` 等都以 `useActionState` 为主，适合提交驱动场景；但 date picker、复杂字段联动、可视校验和 future settings forms 更适合 headless form state。
- **选项**:
  - A: 全站继续只用 `useActionState` + 手工受控字段 — 与现状一致，但复杂表单会继续散乱
  - B: 全站立刻迁到 `@tanstack/react-form` — 统一性强，但会过度扩大本次范围
  - C: 保留 `useActionState` 作为提交和 server action 桥，复杂表单逐步接入 `@tanstack/react-form`，并遵循 `shadcn` 官方表单模式 — 范围可控
- **结论**: 选 C。提交链路不推翻，复杂表单逐步升级。
- **影响**: `tasks` 创建/编辑、`review` 日期范围与草稿编辑、未来 settings 偏好表单会成为首批候选；简单登录或单字段表单不强制迁移。
- **来源**: https://react.dev/reference/react/useActionState  
  https://ui.shadcn.com/docs/forms/tanstack-form  
  https://ui.shadcn.com/docs/forms/next

### Decision 4: 日期选择能力从自定义 `DatePickerField + react-day-picker` 过渡到 `shadcn` 管理的 calendar/date-picker 组合

- **背景**: 现有 `DatePickerField` 已基于 Base UI Popover + `react-day-picker` 跑通，但它是项目私有封装；spec 已要求优先收敛到 `shadcn` 组件体系。
- **选项**:
  - A: 保留现有私有 DatePickerField，仅调样式 — 成本低，但无法达成治理目标
  - B: 用 `shadcn` 的 calendar/date-picker 结构重建日期选择，并保留与当前表单字段的兼容接口 — 最符合 spec
- **结论**: 选 B。保留现有数据格式 `YYYY-MM-DD` 和 hidden input 契约，但组件来源转向 `shadcn` 管理。
- **影响**: `tasks`、`review` 里的日期控件会统一切换；后续 `okr` 周期输入也能沿用。
- **来源**: https://ui.shadcn.com/llms.txt

### Decision 5: Dashboard 图表进入第一批正式改造，使用 `shadcn` chart 体系承接现有 `chartStats`

- **背景**: 现有 dashboard 已有 `chartStats.taskStatusCounts`，页面里也有 `TaskStatusChart`，但仍是页面内私有可视化；spec 已明确要梳理 chart 范围。
- **选项**:
  - A: 保持现有手绘图形，只重排版面 — 实现快，但会把 dashboard 永久停在私有图表层
  - B: 首轮引入 `shadcn` chart 组件能力，替换 dashboard 中的私有图表表达，并为后续统计扩展留接口 — 更符合这次组件治理目标
- **结论**: 选 B。
- **影响**: dashboard 至少要重做三类图表/图形表达：
  - 任务状态分布：基于 `summary.chartStats.taskStatusCounts`
  - 今日执行负载分布：基于 `summary.todayTaskCounts.mustCount / focusCount`
  - 风险与闭环摘要：优先做轻量统计图形或趋势占位，而非纯文本卡片
- **来源**: https://ui.shadcn.com/llms.txt

### Decision 6: 首轮组件落点仍在 `apps/web/src/components/ui`，不把本次改造与 `packages/ui` 启用绑定

- **背景**: `packages/ui` 目前实际上是空包，`src/index.ts` 仅 `export {}`；历史 spec 也明确首轮不迁移 UI 到该包。
- **选项**:
  - A: 继续把组件落在 `apps/web/src/components/ui`，等有第二消费端再考虑抽包 — 与当前现实一致
  - B: 借这次机会同步启用 `packages/ui` — 架构更“整洁”，但会增加打包、边界和导出成本
- **结论**: 选 A。
- **影响**: 本次 `shadcn` 管理的是 app-level UI 层，而不是 monorepo shared package 层。
- **来源**: UNVERIFIED — 基于当前仓库结构与既有 project decision

### Decision 7: Tailwind CSS 优化以“变量类名规范化 + 复用 surface utility”为主，不做 token 体系全量翻修

- **背景**: 当前代码大量使用 `text-[var(--text-primary)]` 这类写法，已有可自动规约的 Tailwind 4 提示；但全量迁移 token 体系仍然过大。
- **选项**:
  - A: 按页面零散修警告 — 快，但会继续分裂
  - B: 借此次 UI 整理统一把变量类名写法、surface class 与常用 token 引用规则收敛起来 — 维护收益更高
- **结论**: 选 B，但范围限于本次触达文件和共享 UI 层。
- **影响**: `globals.css` 与 `components/ui` 会成为规范落点；页面里只保留必要的特殊样式。
- **来源**: https://tailwindcss.com/docs/theme

---

## Module Design

### Module: Dashboard Shell

**职责**: 提供统一的导航骨架、用户控制区和独立滚动主工作区。

**改动概述**: 重构 `apps/web/src/app/(dashboard)/layout.tsx` 与相关 nav 组件，去掉重复顶栏信息，把账户/退出动作收进侧边栏稳定区，并让主内容区域独立滚动。

**关键接口 / 行为**:

```text
DashboardLayout
  - await getSessionUser()
  - 未登录 redirect('/login')
  - sidebar:
    - 品牌
    - DashboardShellNav
    - Current user + logout
  - main frame:
    - optional compact page chrome
    - scrollable content viewport for children
```

**注意事项**:

- 不能破坏现有登录态校验
- 不在 layout 内引入新全局状态
- 若保留顶部 chrome，也只能承担轻量定位，不再重复用户/登出

### Module: shadcn-managed UI Layer

**职责**: 作为 app 内共享组件治理入口，统一管理 panel/header/form/date/chart 等基础能力。

**改动概述**: 在 `apps/web/src/components/ui` 保持现有导出入口，但补充 `shadcn` 管理需要的配置与组件来源规则；已有 Base UI 包装组件按新分层重整。

**关键接口 / 行为**:

```text
UI layer
  - components.json / shadcn config
  - app-level generated or curated components under apps/web/src/components/ui
  - behavior primitives prefer Base UI
  - style/system wrappers align with shell tokens
```

**注意事项**:

- 首轮不迁移到 `packages/ui`
- 生成后的组件仍需按项目视觉系统清理和收口，不能直接原样铺开
- 安装项目级 skill `pnpm dlx skills add shadcn/ui` 可作为实施前置项，不属于 spec/plan 本身的交付

### Module: Date and Form Foundation

**职责**: 收敛日期控件与复杂表单状态管理方式。

**改动概述**: 用 `shadcn` 管理的 calendar/date-picker 替换现有私有 `DatePickerField` 结构；为需要复杂联动与字段校验的场景引入 `@tanstack/react-form`。

**关键接口 / 行为**:

```text
Simple form
  - keep useActionState + server action

Complex client form
  - tanstack form owns field state / validation / derived UI
  - submit still bridges into existing server action path

Date input
  - UI from shadcn-managed calendar/date-picker
  - value contract remains YYYY-MM-DD
```

**注意事项**:

- 不是所有表单都迁移
- 当前 `tasks`、`review` 是优先试点；`tokens` 可继续保持轻量模式
- 若 `shadcn` 官方示例与当前 Base UI 包装方式冲突，以不破坏现有 action 提交流程为优先

### Module: Dashboard Chart Set

**职责**: 将 dashboard 统计表达统一到可复用 chart 组件层。

**改动概述**: 重构 `apps/web/src/app/(dashboard)/dashboard/page.tsx` 中的私有 `TaskStatusChart` 和相关摘要块，改为 `shadcn` chart 驱动的统一表达。

**关键接口 / 行为**:

```text
Dashboard charts v1
  - Task status distribution
    source: summary.chartStats.taskStatusCounts
  - Today load split
    source: summary.todayTaskCounts.mustCount/focusCount
  - Risk / review summary visual
    source: summary.riskKeyResults.length + latestReview presence/status
```

**注意事项**:

- 首轮不追求复杂趋势图；当前服务层没有时间序列聚合
- 图表必须保留关键数字直读能力，不能只剩图形
- 零数据场景要有稳定空态

### Module: Settings Workspace

**职责**: 把设置页变成稳定的二级控制台，而不是“总览页 + 子页混杂”。

**改动概述**: 重构 `settings/page.tsx`、`settings-nav.tsx`、`settings/tokens/tokens-client.tsx`，确保二级导航状态严格对应当前路由，并明确“偏好”是占位还是可用入口。

**关键接口 / 行为**:

```text
Settings shell
  - left: section nav
  - right: current section content only

Settings nav
  - account
  - tokens
  - preferences (disabled or explicit placeholder)
```

**注意事项**:

- `/settings/tokens` 不应继续呈现“账户总览感”
- 如果偏好暂不做完整页面，就必须显式标记未开放

### Module: Page Workspace Refresh

**职责**: 在统一 shell 和新组件层下重组 `dashboard / okr / tasks / quadrants / review / settings` 六页布局。

**改动概述**:
- `dashboard`: 正式图表化、强化总览扫描
- `okr`: 保持当前取数链路，升级工作台布局与日期/表单基座可复用性
- `tasks`: 作为 date picker / complex form 首批试点
- `quadrants`: 保留 dnd-kit，只换布局与视觉
- `review`: 作为 date range + richer form 第二试点
- `settings`: 完成控制台式分组导航重构

**关键接口 / 行为**:

```text
Pages keep:
  - current route structure
  - current server actions
  - current domain semantics

Pages change:
  - layout hierarchy
  - shared component consumption
  - chart/date/form presentation
```

**注意事项**:

- 不在本次内扩大到非 dashboard 路由
- `quadrants` 不混入拖拽模型重构

---

## Data Model

本次不涉及数据库 schema、领域实体或 API 结构变更，因此不生成 `data-model.md`。但前端展示层存在一组“视图模型收敛”：

- dashboard chart props 从页面私有 shape 收敛成统一 chart 输入 shape
- settings section nav 明确 section state
- complex form 场景增加客户端字段状态层，但不改变服务端写入结构

---

## Project Structure

```text
apps/web/
├── [修改] src/app/globals.css
├── [修改] src/app/(dashboard)/layout.tsx
├── [修改] src/app/(dashboard)/dashboard/page.tsx
├── [修改] src/app/(dashboard)/dashboard-shell-nav.tsx
├── [修改] src/app/(dashboard)/tasks/tasks-client.tsx
├── [修改] src/app/(dashboard)/review/review-client.tsx
├── [修改] src/app/(dashboard)/settings/page.tsx
├── [修改] src/app/(dashboard)/settings/settings-nav.tsx
├── [修改] src/app/(dashboard)/settings/tokens/tokens-client.tsx
├── [可选修改] src/app/(dashboard)/okr/okr-client.tsx
├── [可选修改] src/app/(dashboard)/quadrants/quadrants-client.tsx
├── [修改] src/components/ui/index.ts
├── [修改] src/components/ui/date-picker-field.tsx
├── [修改] src/components/ui/form-controls.tsx
├── [修改] src/components/ui/surfaces.tsx
├── [可选新增] src/components/ui/chart.tsx
├── [可选新增] src/components/ui/calendar.tsx
├── [可选新增] src/components/ui/form.tsx
└── [可选新增] components.json

packages/ui/
└── [不改] 保持空包状态，本轮不启用

specs/redesign-dashboard-shell/
├── [已存在] spec.md
└── [修改] plan.md
```

---

## Risks and Tradeoffs

- `shadcn` 官方推荐路径与当前 Base UI 包装现实并不完全同构；若直接照搬模板，容易引入新的风格或状态管理分裂。
- `@tanstack/react-form` 如果使用范围失控，会把本次从 UI 治理拉成表单重构；必须只放在复杂场景。
- dashboard 若新增 chart 但不整理数据表达，会形成“图表组件统一、输入结构仍混乱”的半成品。
- Tailwind 变量类名如果只改页面、不改共享组件，警告会很快回流。
- 若同时安装 `shadcn` skill、生成组件、重做六页，实施阶段需要分批推进，否则回归面过大。

---

## Verification Strategy

实现后按五层验证：

1. 静态验证
   - `pnpm lint`
   - `pnpm typecheck`

2. 组件治理验证
   - 确认首轮 `shadcn` 管理入口已经建立
   - 确认 date picker / chart / form 相关组件不再完全依赖页面私有实现

3. 页面级人工验收
   - 检查六个页面是否都进入统一 shell
   - 检查账户信息和退出登录是否只保留一处稳定控制区
   - 检查长页面滚动时 sidebar 是否稳定、main 是否独立滚动
   - 检查 settings 导航状态与当前路由是否严格一致

4. 关键交互回归
   - `tasks`: 新建/编辑任务、日期选择、状态切换
   - `review`: 生成草稿、日期范围选择、保存草稿
   - `quadrants`: 拖拽移动、错误回滚
   - `settings`: 账户页、tokens 页、偏好占位/禁用状态

5. Dashboard 图表验收
   - 任务状态分布图与数值一致
   - 今日执行负载图与 `must/focus` 数值一致
   - 零数据场景仍有稳定空态

---

## Design Artifacts

本次计划涉及的产物：

| 产物 | 是否需要 | 说明 |
|------|---------|------|
| plan.md | 必须 | 主实现计划 |
| data-model.md | 不需要 | 不涉及实体或存储结构变化 |
| tasks.md | 后续阶段生成 | 由 `tasks` 阶段产出 |
| acceptance.md | 后续阶段生成 | 用于最终验收结论 |

---

## Notes

- 当前 `apps/web/src/components/ui` 已经是实际 UI 入口；`packages/ui` 仍为空，不应和本次一并启动。
- 当前 `DatePickerField` 已基于 `Base UI + react-day-picker` 运行，可作为迁移参考，但不应继续作为长期私有标准。
- 当前 dashboard 服务层只暴露 `taskStatusCounts`；若要做更强图表，优先补轻量聚合，不新增业务接口。
- `pnpm dlx skills add shadcn/ui` 可以作为实施前置项写入 `tasks`，但不是本阶段必须执行的动作。

---

## Sources

| 决策 | 来源 URL | 备注 |
|------|---------|------|
| 统一 shell 放在 App Router layout | https://nextjs.org/docs/app/getting-started/layouts-and-pages | layout 负责共享 UI |
| 保持 React 19 action 提交流程 | https://react.dev/reference/react/useActionState | 继续使用 `useActionState` |
| `shadcn` 组件能力目录与组件管理方向 | https://ui.shadcn.com/llms.txt | 含 chart / calendar / form 文档入口 |
| `TanStack Form` + `shadcn` 组合 | https://ui.shadcn.com/docs/forms/tanstack-form | 复杂表单推荐参考 |
| Next.js 场景下的 `shadcn` 表单模式 | https://ui.shadcn.com/docs/forms/next | 与 App Router 场景相关 |
| Tailwind 4 token/theme 能力 | https://tailwindcss.com/docs/theme | 变量与 utility 收敛依据 |
| 首轮不启用 `packages/ui` | UNVERIFIED | 基于当前仓库现实与既有项目约束 |

