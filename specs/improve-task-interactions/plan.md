# Implementation Plan: 优化任务创建与四象限交互

**Workspace**: `improve-task-interactions` | **Date**: 2026-05-09 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/improve-task-interactions/spec.md`

---

## Summary

本次改动保持现有任务、KR 关联和 dashboard 数据模型不变，重点重组任务页与四象限页的前端交互层。方案上继续沿用 App Router + Server Actions + `useActionState` 的表单提交模式，并统一引入 Base UI 作为 modal、popover、form field、select、toast 等交互组件底座；服务端仅修复任务-KR 关联事务写法，并补充 dashboard 所需的聚合数据与展示结构。

---

## Stack Detected

- Next.js 16.2.4 (from `pnpm-lock.yaml`)
- React 19.2.5 (from `pnpm-lock.yaml`)
- React DOM 19.2.5 (from `pnpm-lock.yaml`)
- Tailwind CSS 4.2.4 (from `pnpm-lock.yaml`)
- Drizzle ORM 0.45.2 (from `pnpm-lock.yaml`)
- TypeScript 5.9.3 (from `pnpm-lock.yaml`)
- Base UI: not installed yet; planned dependency `@base-ui/react` (latest docs referenced: v1.4.1 release listed 2026-04-20)
- React DayPicker: not installed yet; planned dependency `react-day-picker`

---

## Architecture Overview

本次范围主要落在 `apps/web`，分三条链路：

1. 任务创建/编辑链路
   - `tasks/page.tsx` 继续在服务端聚合 `today/inbox/scheduled/done/keyResults`
   - `tasks-client.tsx` 从“页面内嵌大表单”改为“列表页 + modal 表单”
   - `tasks/actions.ts` 继续承接 `createTaskAction/updateTaskAction`
   - `task-service.ts` 继续维护任务状态归一化与 KR 关联写入

2. 四象限链路
   - `quadrants/page.tsx` 继续服务端拉取象限任务
   - `quadrants-client.tsx` 改为拖放式布局，拖动结束后调用现有 `updateTaskQuadrantAction`
   - `quadrants/actions.ts` 继续负责审计和页面 revalidate

3. Dashboard 链路
   - `review-service.ts#getDashboardSummary` 继续作为 dashboard 聚合入口
   - 如现有 summary 不足以支撑图表，则在该聚合入口追加轻量统计字段
   - `dashboard/page.tsx` 用纯 React/Tailwind/SVG 或轻量组件渲染图表，不引入重型 BI 层

整体原则：

- 不改数据库 schema
- 不改任务状态语义
- 不拆散现有 server action 边界
- 让新增交互基于 Base UI primitives 封装成本项目的轻量 UI 组件

---

## Replanned Strategy

经过补充讨论，本功能的实现顺序需要从“业务页面直接重构”调整为“Base UI 底座先行，再迁移业务交互”：

1. 先引入 `@base-ui/react`，建立项目级 UI wrappers。
   - 范围限定在本次触达路径：modal、popover/date picker、form field、select、checkbox、toast/feedback。
   - 不做全站历史组件迁移，不把所有现有 UI 一次性替换；全站迁移后续单独开 feature。

2. 再改任务创建/编辑。
   - 任务创建入口固定为 Base UI Dialog modal。
   - 表单控件优先改为 Base UI Field/Form/Input/Select/Checkbox 组合。
   - 日期选择器使用 Base UI Popover + Field/Form/Input/Button 承载交互外壳，日期选择核心使用 `react-day-picker`。

3. 再改四象限拖拽。
   - 拖拽仍采用 `dnd-kit`，因为 Base UI 组件清单不包含 drag-and-drop。
   - 四象限中的菜单、反馈、提示等交互如需新增，走 Base UI wrapper。

4. 最后改 dashboard 图表与圆角。
   - 图表保持轻量，不引入重型 BI。
   - 圆角先覆盖 dashboard、tasks、quadrants 触达区域，避免扩散成全站样式迁移。

---

## Key Design Decisions

### Decision 1: 继续使用 Server Actions + `useActionState` 驱动任务表单

- **背景**: 任务创建和编辑已经使用 `useActionState(createTaskAction/updateTaskAction)`，与当前 App Router 结构一致。
- **选项**:
  - A: 保留 Server Actions + `useActionState`，只重构表单容器和字段组织 — 与现有代码一致，改动面更小
  - B: 改成手动 `fetch` + 本地提交状态管理 — 灵活，但会引入额外状态同步和错误处理分叉
- **结论**: 选择 A。把主要改动集中在交互层，不重写提交流程。
- **影响**: `TaskForm` 可以拆分成 modal 内容组件，但提交函数和错误回显模式保持不变。
- **来源**: https://react.dev/reference/react/useActionState , https://nextjs.org/docs/app/guides/forms

### Decision 2: 新建任务 modal 基于 Base UI Dialog

- **背景**: 仓库当前没有现成 modal/drawer 组件，需求已明确固定为 `modal`，并且用户要求统一使用 Base UI，避免继续新增原生封装。
- **选项**:
  - A: 使用 Base UI Dialog 封装项目级 `Modal` — 与统一组件底座一致，可复用 Base UI 的弹层、焦点和可访问性能力
  - B: 基于原生 `<dialog>` 自封装 — 依赖少，但会分叉出一套本地弹层行为
- **结论**: 选择 A。新增 `Modal` 只是项目样式和 API 包装，底层必须是 Base UI Dialog。
- **影响**: 需要安装 `@base-ui/react`，并在 `components/ui` 中建立基于 Base UI 的项目级 wrapper。
- **来源**: https://base-ui.com/llms.txt , https://base-ui.com/react/components/dialog.md

### Decision 3: 日期选择基于 Base UI 外壳 + `react-day-picker` 日期核心

- **背景**: 当前任务页和列表内排期动作都直接使用 `input[type="date"]`，用户预期是“有组件的日期下拉/选择”，并且组件底座统一为 Base UI。
- **选项**:
  - A: 用 Base UI Field/Form/Input 管理字段语义，用 Base UI Popover 承载弹层，用 `react-day-picker` 渲染日期选择核心 — 与统一底座一致，也避免自研日期网格
  - B: 自己实现日期网格 — 可控，但会承担键盘、边界日期、无障碍和本地化细节
  - C: 继续封装原生 `input[type="date"]` — 改动小，但不满足统一组件方向
- **结论**: 选择 A。日期字段的外层字段语义、错误态、弹层和按钮交互来自 Base UI；日期选择核心使用 `react-day-picker`；日期值仍提交 `YYYY-MM-DD`。
- **影响**: 至少替换任务表单里的 `scheduledDate`、`dueDate`，以及收件箱内联排期动作；组件接口要兼容空值、清空动作和 `YYYY-MM-DD` 提交格式。需要新增依赖 `react-day-picker`。
- **来源**: https://base-ui.com/llms.txt , https://base-ui.com/react/components/popover.md , https://base-ui.com/react/components/field.md , https://base-ui.com/react/components/form.md , https://base-ui.com/react/components/input.md , https://daypicker.dev/

### Decision 4: 四象限拖拽优先采用 `dnd-kit`，而不是原生 HTML Drag and Drop

- **背景**: 需求要求拖动交互，同时 spec 明确桌面端和移动端都要可用；Base UI 组件清单不包含 drag-and-drop，原生 HTML DnD 对触摸支持较弱，不利于移动端一致性。
- **选项**:
  - A: 原生 HTML Drag and Drop — 无第三方依赖，但触摸和键盘支持弱
  - B: `dnd-kit` 传感器 + sortable/drop zone 模式 — 额外依赖，但更适合 pointer/touch/keyboard 场景
- **结论**: 选择 B。拖拽是这次核心体验之一，优先保证一致性和可访问性。
- **影响**: 会在四象限页新增一层 client-side 拖拽状态，并把拖动结束事件映射为现有 `updateTaskQuadrantAction`；如果保存失败，需要回退视觉位置并提示。
- **来源**: https://github.com/clauderic/dnd-kit , https://github.com/clauderic/dnd-kit#readme

### Decision 5: Dashboard 图表优先复用现有 summary 数据，图表实现保持轻量

- **背景**: `getDashboardSummary()` 当前已聚合周期、今日任务数、风险 KR、最近复盘，但页面仍是静态卡片。
- **选项**:
  - A: 追加少量聚合字段，用轻量 SVG/CSS 图表表达 — 依赖少，适合现有 dashboard
  - B: 引入完整图表库或报表层 — 灵活，但超出本次范围
- **结论**: 选择 A。先做 1 到 2 个高信号图表，例如任务状态分布、今日执行负载或 KR 风险概览。
- **影响**: 可能需要在 `review-service.ts` 或 `task-service.ts` 增加小型聚合函数，但不引入新表或重型数据管道。
- **来源**: UNVERIFIED — 属于产品/工程取舍，不依赖框架专有特性

### Decision 6: 新增交互组件统一使用 Base UI，项目内只保留样式 wrapper

- **背景**: 用户明确指出当前组件都是原生封装，要求统一使用 Base UI。
- **选项**:
  - A: 在 `components/ui` 中基于 Base UI 建项目级 wrappers — 统一行为底座，同时保留本项目样式和 API
  - B: 业务页面直接大量使用 Base UI 原子组件 — 少一层封装，但业务文件会混入重复样式和组合细节
- **结论**: 选择 A。新增 `Modal`、日期字段、表单控件、toast/feedback、select/menu 等优先基于 Base UI wrapper。
- **影响**: 需要新增依赖 `@base-ui/react`；后续任务拆解中应先做组件底座，再迁移任务页和四象限页。
- **来源**: https://base-ui.com/llms.txt , https://base-ui.com/react/overview/quick-start.md , https://base-ui.com/react/handbook/styling.md

---

## Module Design

### Module: `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`

**职责**: 承担任务页的视图切换、列表交互、创建/编辑入口和表单容器状态。

**改动概述**:

- 把 `showCreateForm` / `editingTask` 从“控制页面内表单显隐”改为“控制 modal 打开状态和模式”
- 将 `TaskForm` 拆成更适合 modal 的结构：
  - 快速字段默认展开：标题、状态、日期、今日类型
  - 次级字段折叠或弱化：备注、优先级、精力、KR、多选、重要/紧急
- 把内联 `input[type="date"]` 替换为统一日期组件
- 收件箱内联排期动作改为同一日期组件或轻量排期弹层，避免散落原生日期输入
- 表单字段、选择器、复选框、错误态优先迁移到 Base UI Field/Form/Input/Select/Checkbox wrapper
- 成功后关闭 modal；失败时保持 modal 打开并显示错误

**关键接口 / 行为**:

```text
TasksClient
  state:
    activeView
    taskModal = { mode: 'create' | 'edit', taskId? } | null
  actions:
    openCreateModal()
    openEditModal(task)
    closeTaskModal()
  render:
    TaskViewSwitcher
    TaskLists
    TaskModal(TaskForm)
```

**注意事项**:

- 现有 `useActionState` 成功后会通过 `error === ''` 关闭容器，重构时要避免首次渲染误关
- 编辑任务与新建任务不能同时打开两个 modal
- modal 关闭、焦点管理和遮罩行为由 Base UI Dialog 承担；项目 wrapper 只负责样式和业务 API

### Module: 新增 Base UI 驱动的项目级 UI wrappers

**职责**: 以 Base UI 为底座，提供任务页和未来 dashboard 页面可复用的轻量项目组件。

**改动概述**:

- 新增 `Modal` wrapper，底层使用 Base UI Dialog
- 新增 `DatePickerField` wrapper，底层组合 Base UI Field/Form/Input/Popover/Button 与 `react-day-picker`
- 按需新增 `SelectField`、`CheckboxField`、`Toast` 或 `Feedback` wrapper，避免业务页继续散落原生控件
- 更新 `components/ui/index.ts` 暴露新增 UI 组件

**关键接口 / 行为**:

```text
<Modal open={boolean} onOpenChange={fn} title=... description=...>
  children
</Modal>

<DatePickerField
  name="scheduledDate"
  defaultValue="2026-05-09" | ""
  allowClear
/>
```

**注意事项**:

- 本次不强求做完整通用 design system，只做当前 dashboard/task 场景所需最小 Base UI wrapper 集合
- 组件 API 要能同时服务表单级字段和列表内快速排期
- 业务页面不应直接重复组合 Base UI 原子组件；先沉到项目级 wrapper

### Module: `apps/web/src/lib/services/task-service.ts`

**职责**: 维护任务写入规则、任务-KR 关联、象限字段更新与统计函数。

**改动概述**:

- 修复 `replaceTaskKeyResultLinks()` 事务实现，避免 SQLite/Drizzle 事务回调返回 Promise 查询对象时触发 `Transaction function cannot return a promise`
- 视实现方式，可能把“删旧链接 + 插入新链接 + 读回结果”改为：
  - 事务里只做写入
  - 事务外单独查询回读
  - 或改用与当前驱动兼容的同步/顺序返回方式
- 如 dashboard 图表需要任务状态分布，可补 `listTaskStatusCounts()` 或等价聚合函数

**关键接口 / 行为**:

```text
replaceTaskKeyResultLinks(taskId, keyResultIds)
  dedupe ids
  transaction:
    delete old links
    insert new links if any
  optional:
    query links after transaction
```

**注意事项**:

- 不能破坏 `createTaskAction` / `updateTaskAction` 现有调用方式
- 需要补测试覆盖“无 KR / 多 KR / 去重 KR / 成功后可回读”

### Module: `apps/web/src/app/(dashboard)/quadrants/quadrants-client.tsx`

**职责**: 负责四象限视图的客户端分组、拖拽状态和保存反馈。

**改动概述**:

- 把“每张卡片右侧一排按钮”改为“拖动卡片进入目标象限”
- 每个象限区块成为 droppable 容器
- 每张任务卡变成 draggable 项
- 拖拽结束后：
  - 计算目标象限
  - 做 optimistic UI 重排
  - 调用 `updateTaskQuadrantAction`
  - 失败则回退并展示错误
- 保留可访问替代交互，例如卡片菜单、次级按钮或键盘可触发的重新归类入口

**关键接口 / 行为**:

```text
QuadrantsClient(tasks)
  localState = grouped tasks
  onDragEnd(taskId, targetQuadrant)
    if target changed:
      optimistic move
      submit server action
      rollback on failure
```

**注意事项**:

- 当前 action 是 `void` 风格；若要做失败反馈，可能需要补一个能返回错误状态的 action 包装
- `/quadrants`、`/dashboard`、`/tasks` 都依赖象限字段更新后的 revalidate
- 任务状态不应因拖动改变

### Module: `apps/web/src/app/(dashboard)/dashboard/page.tsx` + `review-service.ts`

**职责**: 提供 dashboard 的轻量图表和统一卡片样式。

**改动概述**:

- 从“数字卡片 + 列表”升级为“数字卡片 + 1~2 个图表 + 列表”
- 倾向图表候选：
  - 今日任务负载图：`must` vs `focus`
  - 任务状态概览图：`inbox` / `today` / `scheduled` / `done`
  - 风险 KR 比例或当前周期 KR 健康概览
- 统一把 dashboard、tasks、quadrants 等核心页面的 `rounded-2xl / rounded-xl` 下调一档
- 如果 dashboard 新增弹层、提示、选择控件，同样走 Base UI wrapper

**关键接口 / 行为**:

```text
getDashboardSummary()
  currentPeriodSummary
  todayTaskCounts
  riskKeyResults
  latestReview
  optional chartStats
```

**注意事项**:

- 图表空态不能报错，也不能出现除零
- 圆角调整应从核心 dashboard/task/quadrant 页面先收敛，不必一口气扫全仓库

---

## Data Model

本次不改数据库 schema，但会调整以下模型边界：

- `Task` 的数据库字段不变，仍以 `status / todayType / scheduledDate / dueDate / important / urgent` 驱动任务视图
- `Task-KR Link` 的写入流程会调整事务边界，但关系模型不变
- `DashboardSummary` 可能新增只读聚合字段以支持图表展示
- 新增基于 Base UI Dialog/Popover/Form 的 `Modal` / `DatePickerField` / `QuadrantDragState` 等前端瞬时状态模型

详细状态与关系见 [data-model.md](data-model.md)。

---

## Project Structure

```text
apps/web/src/
├── [修改] package.json
├── [修改] ../../pnpm-lock.yaml
├── [修改] app/(dashboard)/tasks/tasks-client.tsx
├── [修改] app/(dashboard)/tasks/actions.ts
├── [修改] app/(dashboard)/quadrants/quadrants-client.tsx
├── [修改] app/(dashboard)/quadrants/actions.ts
├── [修改] app/(dashboard)/dashboard/page.tsx
├── [新增] components/ui/modal.tsx
├── [新增] components/ui/date-picker-field.tsx
├── [新增/修改] components/ui/form-controls.tsx
├── [新增/修改] components/ui/toast.tsx
├── [修改] components/ui/index.ts
├── [修改] lib/services/task-service.ts
├── [修改] lib/services/review-service.ts
├── [修改] __tests__/tasks/task-actions.test.ts
├── [修改] __tests__/tasks/task-service.test.ts
├── [修改] __tests__/quadrants/quadrants-action.test.ts
└── [修改/新增] __tests__/dashboard/dashboard-summary.test.ts

specs/improve-task-interactions/
├── [新增] plan.md
└── [新增] data-model.md
```

---

## Risks and Tradeoffs

- `replaceTaskKeyResultLinks()` 的报错和具体驱动实现相关，修复时要以实际测试结果为准，避免“看起来对”但仍触发底层限制。
- Base UI 引入会增加依赖和组合方式迁移成本，但能统一弹层、字段、选择、提示等交互底座。
- Base UI 没有独立日期选择组件，因此日期核心使用 `react-day-picker`；弹层、字段、按钮、表单错误语义仍由 Base UI 承担。
- modal 与表单状态耦合较高，如果直接在一个大组件里硬塞，会让 `tasks-client.tsx` 更难维护；建议顺手做有限度拆分。
- 四象限拖拽若没有错误回退，会造成 UI 和服务端状态短暂不一致；需要明确 optimistic 和 rollback 行为。
- 引入拖拽库会增加一点体积，但比自己补 pointer/touch/keyboard 兼容更稳。
- dashboard 图表如果引入完整图表库，会超出本次范围；计划中应坚持轻量表达。
- 圆角收紧如果全仓库同时推进，改动面会失控；应优先覆盖 dashboard、tasks、quadrants 以及它们直接使用的卡片。

---

## Verification Strategy

- 单元测试
  - `task-service.test.ts`: 补事务修复相关场景
  - `task-actions.test.ts`: 补创建成功/失败下 modal 依赖的数据契约
  - `quadrants-action.test.ts`: 如 action 返回值调整，更新断言
  - `dashboard-summary.test.ts`: 补图表依赖的 summary 聚合字段
- 组件/交互验证
  - 手动验证任务页：打开/关闭 modal、快速创建、错误保留、编辑流程
  - 手动验证日期字段：选择日期、清空日期、排期校验
  - 手动验证四象限：拖到新象限、刷新后持久化、失败回退、键盘替代操作
  - 手动验证 dashboard：图表空态、非空态、圆角风格一致性
- 工程验证
  - `pnpm install`
  - `pnpm test`
  - `pnpm typecheck`
  - `pnpm lint`

---

## Design Artifacts

本次计划涉及的产物：

| 产物 | 是否需要 | 说明 |
|------|---------|------|
| plan.md | 必须 | 主实现计划 |
| data-model.md | 需要 | 虽不改 schema，但需明确状态流和只读聚合边界 |
| tasks.md | 后续阶段生成 | 由 `tasks` 阶段产出 |
| acceptance.md | 后续阶段生成 | 用于最终验收结论 |

---

## Notes

- 当前代码库没有现成 modal、date-picker、chart、drag-and-drop primitive；本次会以 Base UI 为交互底座，并用 `react-day-picker` 提供日期核心，而不是继续原生封装。
- 任务页目前中英文本和测试报错文案存在不一致，实施阶段若顺手统一，需要注意不要无意扩大范围。
- dashboard 图表应优先利用现有 summary 数据；如果需要新增统计函数，优先放在 service 层而不是页面内临时拼装。

---

## Sources

| 决策 | 来源 URL | 备注 |
|------|---------|------|
| 继续使用 `useActionState` + Server Actions | https://react.dev/reference/react/useActionState | React 19 表单 action 状态管理 |
| 继续使用 App Router forms 模式 | https://nextjs.org/docs/app/guides/forms | Next.js 官方 forms 指南 |
| Base UI 总入口与版本线索 | https://base-ui.com/llms.txt | `@base-ui/react`、unstyled、Tailwind v4 示例、组件索引 |
| 使用 Base UI Dialog 封装 modal | https://base-ui.com/react/components/dialog.md | Dialog 组件 |
| 使用 Base UI Popover/Field/Form/Input 封装日期字段 | https://base-ui.com/react/components/popover.md | 日期弹层和字段底座 |
| 使用 React DayPicker 作为日期选择核心 | https://daypicker.dev/ | 官方文档，React 日期选择组件 |
| 四象限拖拽采用 `dnd-kit` | https://github.com/clauderic/dnd-kit | 官方仓库，说明不基于 HTML5 DnD、支持现代输入方式 |
| 轻量图表策略 | UNVERIFIED | 基于仓库现状的工程取舍，不是框架专有模式 |
