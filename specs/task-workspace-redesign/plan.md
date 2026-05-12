# Implementation Plan: 任务工作区与全局壳层重构

**Workspace**: `task-workspace-redesign` | **Date**: 2026-05-12 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/task-workspace-redesign/spec.md`

---

## Summary

本次方案分两层推进：先收紧 dashboard 全局壳层并加入左侧导航收展，再以新任务域模型重建任务页，使其从现有四视图卡片页升级为三列任务工作区。现有 Next.js App Router、Drizzle、TanStack Form、Base UI / shadcn 风格组件体系可继续复用，但当前 `tasks` 的 `today/inbox/scheduled/done` 状态模型不再作为新方案约束。

---

## Architecture Overview

整体改动分为四块：

1. dashboard 壳层
   - 调整 [`apps/web/src/app/(dashboard)/layout.tsx`](/Users/yqg/personal/webs/stride-os/apps/web/src/app/(dashboard)/layout.tsx:1) 的整体网格、外层 padding 和侧栏宽度策略
   - 将全局导航拆成“服务端壳层 + 客户端收展控制”组合
   - 侧栏当前激活态仍由客户端 `usePathname` 负责

2. 任务域数据层
   - 在 `packages/db/src/schema/*.ts` 中新增任务清单、重复定义与新版任务实体
   - 现有 `tasks/taskKrLinks` 相关 schema 与服务需要按初版重构思路替换，而不是继续叠加旧状态字段语义

3. 任务应用层
   - 重写 `apps/web/src/lib/services/task-service.ts`
   - 新增清单查询、智能视图查询、任务详情、重复定义生成逻辑
   - server actions 从“状态迁移动作集合”改为“面向三列工作区的创建/编辑/完成/选择来源刷新”

4. 任务页面 UI
   - `apps/web/src/app/(dashboard)/tasks/page.tsx` 继续作为 Server Component 聚合数据
   - `tasks-client.tsx` 改为三列容器和选中态驱动
   - 统一弹窗继续复用现有 Base UI `Modal`、`DatePickerField` 等组件，但要补快捷日期、重复配置与清单选择

数据流方向：

- 服务端页面读取当前来源列表、任务分组、详情初始项、清单计数
- 客户端维护 `selectedSourceId`、`selectedTaskId`、导航收展态
- 表单提交通过 server actions 落库后 `revalidatePath('/tasks')`
- 若提交的是重复定义，则先写定义，再保证今日实例存在

---

## Key Design Decisions

### Decision 1: 继续采用 Server Component 取数，客户端只承载交互态

- **背景**: 任务页需要同时加载第一栏来源、第二栏任务集合、第三栏详情初始值，还要保留客户端交互。
- **选项**:
  - A: 页面整体改为 Client Component，自行拉取所有数据 — 交互自由，但会扩大首屏客户端负担，并绕开当前 App Router 数据路径
  - B: 保持页面与布局为 Server Component，局部交互壳与表单使用 Client Component — 与当前代码结构一致，数据获取更贴近数据库
- **结论**: 选 B。任务页仍以 Server Component 组织初始数据，三列交互和表单弹窗放在客户端。
- **影响**: 需要清楚划分服务端取数边界和客户端状态边界，避免把查询逻辑重新塞回浏览器。
- **来源**: https://nextjs.org/docs/app/getting-started/server-and-client-components

### Decision 2: 全局导航收展状态放在客户端并持久化到 `localStorage`

- **背景**: 收展行为依赖浏览器本地状态与即时交互，且当前导航高亮已使用 `usePathname`。
- **选项**:
  - A: 仅服务端渲染固定宽度侧栏 — 实现简单，但不满足收展需求
  - B: 新增客户端导航壳，负责收展状态和本地持久化，服务端布局只提供骨架 — 更符合交互需求
- **结论**: 选 B。
- **影响**: 需要把侧栏宽度切换和激活态渲染集中到客户端导航层，同时控制好 hydration 后的视觉跳变。
- **来源**: https://nextjs.org/docs/app/api-reference/functions/use-pathname

### Decision 3: 继续使用 `useActionState` 驱动任务弹窗提交状态

- **背景**: 当前任务表单已经在 React 19 下使用 `useActionState + startTransition`，新任务页仍需要表单 pending/error 管理。
- **选项**:
  - A: 改回 `useState` 手动管理提交状态 — 可行，但会回退到更分散的提交状态处理
  - B: 保持 `useActionState` 模式，扩展到新建任务、编辑任务、清单创建、重复定义提交 — 与当前技术栈和现有代码一致
- **结论**: 选 B。
- **影响**: 需要把 server action 的返回值统一成可序列化的表单状态对象。
- **来源**: https://react.dev/reference/react/useActionState

### Decision 4: 第二栏和第三栏使用独立滚动容器，栏内头部用 `position: sticky`

- **背景**: spec 要求第二栏、第三栏各自滚动，并优先实现栏内吸顶工具条。
- **选项**:
  - A: 整页单滚动，工具条跟随页面 — 结构简单，但不满足交互要求
  - B: 每栏独立滚动，吸顶条以该栏作为滚动容器 — 满足 spec，结构更接近效率工具
- **结论**: 选 B。
- **影响**: 需要严格控制容器层级、`overflow` 和 sticky 参照容器，避免被外层 `overflow-hidden` 破坏。
- **来源**: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position#sticky_positioning

### Decision 5: 初版直接重建任务域，不为旧 `status/todayType/scheduledDate` 兼容做设计

- **背景**: 现有 [`task-service.ts`](/Users/yqg/personal/webs/stride-os/apps/web/src/lib/services/task-service.ts:1) 围绕 `today/inbox/scheduled/done/canceled` 建模，与新 spec 的“单一 `dueDate` + 智能来源 + 清单 + 重复定义”差异过大。
- **选项**:
  - A: 在旧表上持续打补丁 — 改动表面小，但会把旧状态机和新来源模型长期绑定
  - B: 按初版项目思路重建任务域结构 — 改动面更集中，但后续边界清晰
- **结论**: 选 B。
- **影响**: 当前任务服务、actions、页面和相关测试都要按新域重写；但这能避免把旧概念持续带入后续功能。
- **来源**: UNVERIFIED — 项目内业务决策，非框架文档问题

---

## Module Design

### Module: Dashboard 壳层

**职责**: 提供更紧凑的全局工作台骨架，并承载左侧导航收展。

**改动概述**:

- 缩减 [`layout.tsx`](/Users/yqg/personal/webs/stride-os/apps/web/src/app/(dashboard)/layout.tsx:1) 外层 `px/py`
- 将固定 `260px` 侧栏改为“展开宽 / 收起宽”双态
- 账户信息区保留在侧栏底部，但需要在收起态提供压缩展示
- 把导航激活态和收展控件统一收束到导航组件

**关键接口 / 行为**:

```text
DashboardLayout (Server)
  -> DashboardShellClient (Client, optional wrapper)
     -> DashboardShellNav
        - read pathname
        - read/write collapsed preference
        - render nav items in expanded/collapsed mode
```

**注意事项**:

- 现有布局使用 `overflow-hidden` 包裹主壳层，重构时要确保不影响任务页分栏滚动
- 不应把整个 layout 都改成 Client Component，只把需要本地状态的部分下沉

### Module: 任务域数据模型

**职责**: 提供“清单 + 任务实例 + 重复定义 + 智能来源”的新域基础。

**改动概述**:

- 在 `packages/db/src/schema/sqlite.ts` 与 `postgres.ts` 新增 `taskLists`、`taskDefinitions`
- 新版 `tasks` 仅承载真实可执行实例，保留 `dueDate`、`completedAt`、`definitionId`
- `packages/db/src/schema/index.ts` 暴露新实体

**关键接口 / 行为**:

```text
task_lists
  - system/user list

task_definitions
  - recurring source of truth

tasks
  - executable task instance
  - optional link to definition
```

**注意事项**:

- 现有 OKR 任务关联表 `taskKrLinks` 仍可复用，但其外键目标需与新版 `tasks` 对齐
- 若重复定义也需要保留 KR 关联，需决定是复用现有关联表到“实例”层，还是增加“定义层关联”；本次计划建议在 `data-model.md` 明确

### Module: 任务查询与应用服务

**职责**: 根据第一栏来源生成第二栏任务分组，并提供任务详情、清单计数、重复实例保证逻辑。

**改动概述**:

- 重写 `apps/web/src/lib/services/task-service.ts`
- 增加 `listTaskSources()`、`listTaskListsWithCounts()`、`listTasksForSource()`、`getTaskDetail()`、`ensureRecurringTasksForDate()` 等能力
- 将当前 `listTodayTasks / listInboxTasks / listScheduledTasks / listDoneTasks` 退役

**关键接口 / 行为**:

```text
listTaskWorkspaceData(sourceId, selectedTaskId?)
  -> source metadata
  -> grouped tasks for center column
  -> selected task detail for right column

ensureRecurringTasksForDate(date)
  -> load due recurring definitions
  -> create missing task instances idempotently
```

**注意事项**:

- 智能列表过滤与分组都基于 `dueDate`
- `Completed` 组必须始终返回，即使为空
- 需要避免在每次读取时生成重复实例，建议使用 definition/date 唯一约束

### Module: 任务 server actions

**职责**: 处理清单创建、普通任务创建/更新、重复定义创建/更新、完成态切换。

**改动概述**:

- 替换 [`apps/web/src/app/(dashboard)/tasks/actions.ts`](/Users/yqg/personal/webs/stride-os/apps/web/src/app/(dashboard)/tasks/actions.ts:1) 中围绕旧状态模型的动作
- 动作输出统一为 `ActionState = { error: string }` 或更细的可序列化结构
- 保留 `revalidatePath('/tasks')`，并按需补 `revalidatePath('/dashboard')`

**关键接口 / 行为**:

```text
createTaskListAction(formData)
createTaskAction(formData)
updateTaskAction(formData)
toggleTaskCompletionAction(taskId, completed)
createTaskDefinitionAction(formData)
updateTaskDefinitionAction(formData)
```

**注意事项**:

- 普通任务与重复定义不应共用同一持久化函数，但可以共用表单解析层
- 完成态切换只改 `completedAt`，不清理 `dueDate`

### Module: 任务页三列 UI

**职责**: 呈现第一栏来源导航、第二栏任务列表、第三栏详情，以及统一弹窗。

**改动概述**:

- 重写 [`tasks-client.tsx`](/Users/yqg/personal/webs/stride-os/apps/web/src/app/(dashboard)/tasks/tasks-client.tsx:1)
- 第一栏实现智能来源和清单分区
- 第二栏实现 sticky 顶栏、快捷添加、任务分组、完成态迁移
- 第三栏实现空态与详情态
- 现有 `Modal`、`DatePickerField`、`Button`、`Empty`、`ErrorAlert` 等 UI 组件优先复用

**关键接口 / 行为**:

```text
TasksWorkspaceClient
  - selectedSourceId state
  - selectedTaskId state
  - modal state
  - list-creation state

TaskFormModal
  - common fields
  - date shortcuts + calendar
  - recurrence section
  - list selector
```

**注意事项**:

- 当前 `DatePickerField` 只有日历弹出和清空能力，需要扩展快捷选日
- 第二栏行点击与 checkbox 点击必须明确分离，避免交互冲突

---

## Data Model

本次需求明确涉及实体、关系和状态边界，需补充独立 [`data-model.md`](data-model.md)。

核心变化：

- 新增任务清单实体，承接系统保留清单与用户清单
- 新增重复任务定义实体，承接频率与结束条件
- 重建任务实例实体，只保留 `dueDate` 与 `completedAt` 时间语义
- 明确保留 OKR 关联如何挂靠在实例层与定义层

---

## Project Structure

```text
specs/task-workspace-redesign/
├── [已新增] spec.md
├── [新增] plan.md
└── [新增] data-model.md

apps/web/src/app/(dashboard)/
├── [修改] layout.tsx
├── [修改] dashboard-shell-nav.tsx
└── tasks/
    ├── [修改] page.tsx
    ├── [修改] actions.ts
    ├── [重写] tasks-client.tsx
    ├── [修改/替换] task-form-bridge.ts
    └── [新增] workspace-specific subcomponents as needed

apps/web/src/lib/services/
├── [重写] task-service.ts
└── [按需修改] review-service.ts / dashboard summary dependencies

apps/web/src/components/ui/
├── [修改] modal.tsx
├── [修改] date-picker-field.tsx
└── [按需新增] compact list / sticky toolbar helpers

packages/db/src/schema/
├── [修改] sqlite.ts
├── [修改] postgres.ts
└── [修改] index.ts

apps/web/src/__tests__/
├── [修改] tasks/task-service.test.ts
├── [修改] tasks/task-actions.test.ts
├── [新增/修改] tasks/task-workspace*.test.ts
└── [按需修改] dashboard/review related tests
```

---

## Risks and Tradeoffs

- 现有任务服务深度绑定旧状态模型，重构会牵动 dashboard/review 对任务统计的依赖，需要同步替换而不是只改 tasks 页面。
- 第二栏和第三栏独立滚动依赖容器层级精确控制；当前 dashboard layout 已存在多层 `overflow-hidden/auto`，稍有不慎就会破坏 sticky。
- 重复定义若只生成“今天实例”，则 `Tomorrow` 等智能视图在首版要么接受不展示未来重复实例，要么额外在读取该视图时补目标日期实例；这需要在实现时保持行为一致。
- 清单、任务实例、重复定义三类实体引入后，测试面会明显扩大，但换来后续任务功能边界更清晰。

---

## Verification Strategy

验证分三层：

1. 数据与服务层
   - Vitest 覆盖清单创建、来源计数、智能列表过滤、完成态迁移、重复定义幂等生成
   - 检查 `Completed` 分组在所有来源下都存在

2. 页面与交互层
   - 任务页组件测试覆盖来源切换、任务选中、详情联动、快捷添加默认归属、重复配置表单校验
   - 导航收展测试覆盖模式切换与本地持久化

3. 集成与人工验收
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm lint`
   - 本地打开 `/tasks`、`/dashboard` 验证壳层留白、导航收展、三列滚动和弹窗流程

---

## Design Artifacts

本次计划涉及的产物：

| 产物 | 是否需要 | 说明 |
|------|---------|------|
| plan.md | 必须 | 主实现计划 |
| data-model.md | 需要 | 本次涉及实体、关系、约束变化 |
| tasks.md | 后续阶段生成 | 由 `tasks` 阶段产出 |
| acceptance.md | 后续阶段生成 | 用于最终验收结论 |

---

## Notes

- STACK DETECTED:
  - Next.js 16.x (from `apps/web/package.json`)
  - React 19.x (from `apps/web/package.json`)
  - Tailwind CSS 4.x (from `apps/web/package.json`)
  - Drizzle ORM 0.45.x (from `apps/web/package.json`)
  - TanStack React Form 1.32.x (from `apps/web/package.json`)

- 当前代码已经在任务表单提交上使用 `useActionState`，本方案与现有 React 19 写法一致，不存在必须回退旧模式的文档冲突。
- 当前 `DashboardShellNav` 只有文字导航，没有图标；实现阶段需要决定图标来源，但这不阻塞进入 `tasks`。

---

## Sources

| 决策 | 来源 URL | 备注 |
|------|---------|------|
| Decision 1 | https://nextjs.org/docs/app/getting-started/server-and-client-components | Next 16 App Router 下页面/布局默认走 Server Components |
| Decision 2 | https://nextjs.org/docs/app/api-reference/functions/use-pathname | `usePathname` 只能在 Client Component 中使用 |
| Decision 3 | https://react.dev/reference/react/useActionState | React 19 表单 action 状态管理 |
| Decision 4 | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position#sticky_positioning | sticky 头部依赖滚动容器与阈值 |
| Decision 5 | UNVERIFIED | 业务域重建决策，非框架文档问题 |
