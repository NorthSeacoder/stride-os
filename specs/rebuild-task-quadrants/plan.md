# Implementation Plan: 四象限任务视图重构

**Workspace**: `rebuild-task-quadrants` | **Date**: 2026-05-12 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/rebuild-task-quadrants/spec.md`

---

## Summary

本次重构将把现有 `/quadrants` 从基于 `important/urgent` 的旧页面，改造成完全派生于 `priority + dueDate + today` 的任务视图。方案核心是同时清理 schema 中的旧象限字段、建立统一规则函数与默认反演表、重写四象限页的分组与拖拽链路，并将任务创建/编辑入口对齐到现有任务模块。

---

## Stack Detected

- Next.js `^16` (from `apps/web/package.json`)
- React `^19` / React DOM `^19` (from `apps/web/package.json`)
- `@dnd-kit/core` `^6.3.1` and `@dnd-kit/sortable` `^10.0.0` (from `apps/web/package.json`)
- TanStack React Form `^1.32.0` (from `apps/web/package.json`)
- Drizzle ORM `^0.45` (from `apps/web/package.json` and `packages/db/package.json`)
- TypeScript `^5` (from `apps/web/package.json`)

---

## Architecture Overview

本次改动分四层：

1. 数据模型层
   - 删除 `tasks.important` / `tasks.urgent`
   - 更新 SQLite / Postgres schema、索引和相关测试夹具
   - 因项目未投用，允许直接清空旧任务数据并重建本地数据库

2. 任务规则与服务层
   - 在 `task-service.ts` 中新增四象限规则函数和分组查询模型
   - 以 `priority`、`dueDate`、`listId`、`completedAt` 为唯一数据来源
   - 提供“按象限 + 按清单 + 按完成态”聚合的服务返回结构

3. 任务创建 / 编辑 / 回写层
   - 新建统一的四象限默认反演表
   - 四象限新建和拖拽只回写 `priority` / `dueDate` / `listId`
   - 复用任务页现有 modal / form bridge / server action，补齐 `priority` 字段编辑能力

4. `/quadrants` 页面 UI 层
   - 重写 page server data load 与 client render
   - 2×2 等分布局
   - 每象限按清单分组展示未完成与已完成任务
   - 行级拖拽、checkbox 完成切换、正文点击编辑

---

## Key Design Decisions

### Decision 1: 删除 `important/urgent`，不保留兼容写回

- **背景**: 用户明确要求四象限必须是任务实体的派生视图，旧布尔字段会形成第二真相。
- **选项**:
  - A: 保留 `important/urgent` 并做同步层 — 改动看似更小，但长期存在漂移风险
  - B: 直接删掉旧字段，所有象限行为统一回到 `priority + dueDate` — 改动集中但边界清晰
- **结论**: 选 B。
- **影响**: schema、查询、测试和当前四象限页面都要同步改；但后续不会再出现双写不一致。
- **来源**: UNVERIFIED — 业务与数据建模决策，非框架文档问题

### Decision 2: 继续由 Server Component 负责初始取数，Client Component 负责交互态和拖拽

- **背景**: 四象限首屏需要聚合四个象限、清单分组、完成态分组和表单默认值；同时拖拽和菜单开关必须在客户端完成。
- **选项**:
  - A: 整页改为纯客户端拉数 — 简化本地状态，但会绕开现有 App Router 数据路径
  - B: 保持 `page.tsx` 为 Server Component，客户端只接收结构化初始数据并负责交互 — 更贴合现有代码结构
- **结论**: 选 B。
- **影响**: 服务层需要直接返回“页面可渲染模型”，避免客户端二次拼装过多业务规则。
- **来源**: https://nextjs.org/docs/app/getting-started/server-and-client-components

### Decision 3: 行级拖拽继续使用 `@dnd-kit`，并用 Pointer activation constraint 避免误拖

- **背景**: 需求要求整行拖动且 checkbox 单击不误触拖拽。
- **选项**:
  - A: 自建 pointer/mouse 逻辑 — 可控但成本高，且不复用现有依赖
  - B: 继续使用仓库已存在的 `@dnd-kit`，通过 sensor activation constraint 与 activator 分离处理交互冲突
- **结论**: 选 B。
- **影响**: 四象限任务行要拆分“可点击区”和“拖拽承载区”，并对 checkbox / 编辑点击显式拦截事件。
- **来源**: https://docs.dndkit.com/api-documentation/draggable

### Decision 4: 四宫格内部用独立滚动容器和 sticky 象限头

- **背景**: 每个象限可能内容长度不同，需求要求块内结构稳定且分隔明确。
- **选项**:
  - A: 整页单滚动，象限随页面自然拉伸 — 内容多时会破坏四宫格均衡感
  - B: 四宫格自身固定结构，每个象限内容区独立滚动，头部吸顶 — 更适合任务看板式交互
- **结论**: 选 B。
- **影响**: 需要处理 grid 高度、象限内容区 `min-h-0`、`overflow-y-auto` 和 sticky 参照容器。
- **来源**: https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky_positioning

### Decision 5: 复用任务页现有表单和 actions，但扩展 `priority` 编辑能力

- **背景**: 需求要求四象限新建/编辑与任务页交互对齐，同时四象限默认值必须通过 `priority + dueDate` 实现。
- **选项**:
  - A: 为四象限单独造一套表单和 action — 会再次分叉任务录入栈
  - B: 复用任务页 modal / form bridge / actions，补充 `priority` 字段与象限默认值注入 — 更符合单一任务域
- **结论**: 选 B。
- **影响**: 任务页与四象限页都会共享新的 `priority` 字段编辑能力；四象限只是在打开弹窗时注入不同默认值。
- **来源**: https://react.dev/reference/react/useActionState

### Decision 6: 跨日自动迁移通过“读取时重算”实现，不引入 cron 或后台 job

- **背景**: 需求要求跨日后未完成任务应自动移入更紧急象限。
- **选项**:
  - A: 后台定时刷新缓存象限 — 多余且再次引入缓存真相
  - B: 页面和服务层按 `today` 实时计算象限 — 简单、稳定、符合派生视图定义
- **结论**: 选 B。
- **影响**: 规则函数必须纯净且可测试；页面刷新或重新请求数据后自然完成象限迁移。
- **来源**: UNVERIFIED — 业务实现决策，非框架文档问题

---

## Module Design

### Module: 数据模型与迁移清理

**职责**: 移除旧四象限字段，确保任务表只保留这次需求需要的单一真相字段。

**改动概述**:

- 修改 `packages/db/src/schema/sqlite.ts`
- 修改 `packages/db/src/schema/postgres.ts`
- 更新 `packages/db/src/schema/index.ts`
- 更新本地准备 / seed 路径，允许清空旧任务数据并重建

**关键接口 / 行为**:

```text
tasks
  - keep: id, title, listId, dueDate, completedAt, priority, description/notes, definitionId
  - remove: important, urgent

quadrant = f(priority, dueDate, today)
```

**注意事项**:

- 旧 `idx_tasks_importance_urgency` 相关索引要一起删除
- 任何残留的 `important/urgent` 类型引用都必须同步清理

### Module: 四象限规则与查询服务

**职责**: 以纯函数和聚合查询支撑四象限渲染与回写。

**改动概述**:

- 在 `apps/web/src/lib/services/task-service.ts` 中新增或重写：
  - `getTaskQuadrant`
  - `getTaskUrgencyBand`
  - `buildQuadrantDefaults`
  - `listQuadrantBoard`
  - `moveTaskToQuadrant`
  - `moveTaskToQuadrantList`

**关键接口 / 行为**:

```text
getTaskQuadrant(task, today):
  if no dueDate:
    P1 -> Q1
    P2 -> Q2
    P3 -> Q3
    null -> Q4
  else:
    urgency = D <= 7 ? high : low
    importance = priority in [P1, P2] ? high : low
    map to Q1..Q4

buildQuadrantDefaults(Q1..Q4, today):
  Q1 -> { priority: 'P1', dueDate: today }
  Q2 -> { priority: 'P2', dueDate: today+8d }
  Q3 -> { priority: 'P3', dueDate: today }
  Q4 -> { priority: null, dueDate: today+8d }
```

**注意事项**:

- 规则函数必须对 completed 和 uncompleted 都可计算，但页面展示层再决定是否显示
- 服务返回应直接包含四象限、清单分组、已完成折叠分组和空态所需计数

### Module: 四象限 server actions

**职责**: 承接跨象限拖拽、跨清单拖拽和页面级完成切换。

**改动概述**:

- 重写 `apps/web/src/app/(dashboard)/quadrants/actions.ts`
- 旧 `updateTaskQuadrantAction(taskId, {important, urgent})` 退役
- 改为显式区分：
  - move to quadrant
  - move to list within quadrant
  - toggle completion

**关键接口 / 行为**:

```text
moveTaskToQuadrantAction(taskId, quadrant)
moveTaskToQuadrantListAction(taskId, quadrant, listId)
toggleQuadrantTaskCompletionAction(taskId, completed)
```

**注意事项**:

- action 层不接受 `important/urgent`
- action 成功后需 `revalidatePath('/quadrants')`，按需补 `/tasks` 和 `/dashboard`

### Module: 四象限页面 UI

**职责**: 渲染四宫格、顶部菜单、象限头、清单分组、任务行和拖拽体验。

**改动概述**:

- 更新 `apps/web/src/app/(dashboard)/quadrants/page.tsx`
- 重写 `apps/web/src/app/(dashboard)/quadrants/quadrants-client.tsx`
- 复用现有 UI primitives，必要时抽出小型子组件

**关键接口 / 行为**:

```text
QuadrantsPage (Server)
  -> loads quadrant board data
  -> passes structured props to client

QuadrantsClient (Client)
  - showCompleted state
  - active drag task state
  - modal state for create/edit
  - optimistic move / rollback
```

**注意事项**:

- 象限视觉顺序必须匹配 spec，不要复用当前 `do/decide/delegate/delete` 的旧顺序命名直接映射
- 任务正文点击要打开编辑弹窗，不再只做右侧详情面板选中
- 参考图风格可借鉴，但应保持与现有设计 token 一致

### Module: 共享任务表单与编辑链路

**职责**: 让四象限页和任务页共享同一套任务创建/编辑体验。

**改动概述**:

- 更新 `apps/web/src/app/(dashboard)/tasks/task-form-bridge.ts`
- 更新 `apps/web/src/app/(dashboard)/tasks/actions.ts`
- 更新 `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx` 中的表单字段集

**关键接口 / 行为**:

```text
TaskFormValues
  + priority
  + dueDate
  + listId

getTaskFormValues(task, defaults)
buildTaskFormData(values)
```

**注意事项**:

- 现有任务页也会因共享表单而获得 `priority` 编辑能力
- 首版至少保证 `priority` 和 `dueDate` 可编辑；其他字段继续与任务模块对齐

---

## Data Model

本次需求涉及实体字段清理、派生模型和拖拽默认值映射，需补充独立 [`data-model.md`](data-model.md)。

核心变化：

- 删除 `Task.important` / `Task.urgent`
- 强化 `Task.priority` / `Task.dueDate` 的象限语义
- 新增只读派生模型 `QuadrantProjection`
- 新增只读默认反演模型 `QuadrantDefaults`

---

## Project Structure

```text
specs/
└── [新增] rebuild-task-quadrants/
    ├── spec.md
    ├── plan.md
    ├── data-model.md
    └── tasks.md

packages/db/src/schema/
├── [修改] sqlite.ts
├── [修改] postgres.ts
└── [修改] index.ts

apps/web/src/lib/services/
└── [修改] task-service.ts

apps/web/src/app/(dashboard)/quadrants/
├── [修改] page.tsx
├── [修改] actions.ts
└── [修改] quadrants-client.tsx

apps/web/src/app/(dashboard)/tasks/
├── [修改] actions.ts
├── [修改] task-form-bridge.ts
└── [修改] tasks-client.tsx

apps/web/src/__tests__/
├── [修改] quadrants/*
└── [修改] tasks/*
```

---

## Risks and Tradeoffs

- 删除 schema 字段会波及当前所有 `important/urgent` 引用；需要一次性清理干净，否则 typecheck 会大量失败。
- 共享任务表单意味着四象限需求会反向影响任务页；但这比再造第二套弹窗更可维护。
- 四象限内“同象限跨清单拖拽”若实现成按组 droppable，空组、折叠组和已完成组的放置边界需要定义清楚。
- 读取时重算象限能简化系统，但也要求所有页面和测试都统一使用同一“today”基准，避免时区边界下结果漂移。

---

## Verification Strategy

- 为规则函数补单元测试：
  - `D <= 7`
  - `D > 7`
  - no due date direct map
  - default reverse map
  - cross-day recalculation
- 为 server actions 补测试：
  - move to quadrant
  - move to list in same quadrant
  - unauthorized / not found / rollback path
- 为共享任务表单补测试：
  - `priority` 默认值透传
  - `dueDate` 默认值透传
- 本地人工验收 `/quadrants`：
  - 四宫格布局
  - show completed toggle
  - create in quadrant
  - click checkbox
  - click row edit
  - drag across quadrants
  - drag across lists within same quadrant

---

## Design Artifacts

本次计划涉及的产物：

| 产物 | 是否需要 | 说明 |
|------|---------|------|
| plan.md | 必须 | 主实现计划 |
| data-model.md | 需要 | 这次包含字段删除、派生模型与反演表 |
| tasks.md | 后续阶段生成 | 由 `tasks` 阶段产出 |
| acceptance.md | 可选 | 实现完成后可补人工验收结论 |

---

## Notes

- 旧任务数据清空属于本次设计前提，不需要额外兼容层。
- 顶部 `...` 菜单首版只承载“显示已完成”，不在本次方案里扩展更多操作。
- 现有 `apps/web/src/app/api/v1/tasks/quadrants/route.ts` 如仍保留，应同步升级返回结构或删去未使用接口，避免继续暴露旧语义。

---

## Sources

| 决策 | 来源 URL | 备注 |
|------|---------|------|
| Server Component 取数 + Client 交互分层 | https://nextjs.org/docs/app/getting-started/server-and-client-components | Next.js App Router 官方文档 |
| 共享表单继续使用 `useActionState` | https://react.dev/reference/react/useActionState | React 19 官方文档 |
| 继续使用 `@dnd-kit` 行级拖拽 | https://docs.dndkit.com/api-documentation/draggable | 官方拖拽文档 |
| 象限头 sticky 与独立滚动容器 | https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky_positioning | CSS 参考 |
| 删除旧字段、读取时重算象限 | UNVERIFIED | 业务建模决策 |
