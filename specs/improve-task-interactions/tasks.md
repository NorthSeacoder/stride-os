# Tasks: 优化任务创建与四象限交互

**Workspace**: `improve-task-interactions` | **Date**: 2026-05-09  
**Input**: `specs/improve-task-interactions/spec.md` + `plan.md`  
**Prerequisites**: spec.md, plan.md, data-model.md

---

## 执行原则

- 按依赖顺序推进：依赖与 UI 底座 -> 服务端稳定性 -> 任务页 -> 四象限 -> dashboard -> 验证收尾。
- 本 feature 只迁移本次触达路径和新增交互组件，不做全站 Base UI 迁移。
- 新增或重构的交互组件优先基于 Base UI wrapper；日期核心使用 `react-day-picker`；拖拽使用 `dnd-kit`。
- 任务状态、KR 关联和数据库 schema 不变。

---

## Phase 1: 依赖与 UI 底座

**目标**: 引入本次所需依赖，并建立后续业务改造必须复用的 Base UI 项目级 wrappers。

- [x] T001 [Setup] 安装交互依赖并更新锁文件
  - scope: `apps/web/package.json`, `pnpm-lock.yaml`
  - detail: 添加 `@base-ui/react`、`react-day-picker`、`@dnd-kit/core`、`@dnd-kit/sortable`、`@dnd-kit/utilities`；如实现无需 sortable，可在实现阶段降级为 core-only。
  - verify: `pnpm install` 成功，lockfile 与 workspace 依赖一致。

- [x] T002 [US1] 新增 Base UI Dialog 驱动的 `Modal` wrapper
  - scope: `apps/web/src/components/ui/modal.tsx`, `apps/web/src/components/ui/index.ts`
  - detail: 封装 open/onOpenChange/title/description/children/close 行为；样式遵循当前主题变量；圆角使用收紧后的风格。
  - verify: TypeScript 能导入 `Modal`；手动或局部渲染确认 ESC、关闭按钮、遮罩关闭和焦点行为可用。

- [x] T003 [US1, US2] 新增 Base UI 表单控件 wrappers
  - scope: `apps/web/src/components/ui/form-controls.tsx`, `apps/web/src/components/ui/index.ts`
  - detail: 至少提供本次任务页需要的 `TextField`、`TextareaField`、`SelectField`、`CheckboxField` 或等价 API；底层使用 Base UI Field/Form/Input/Select/Checkbox。
  - verify: wrappers 可在普通 `<form>` 中提交 name/value；必填、错误文本和 disabled 状态可渲染。

- [x] T004 [US2] 新增 `DatePickerField`
  - scope: `apps/web/src/components/ui/date-picker-field.tsx`, `apps/web/src/components/ui/index.ts`
  - detail: 外层使用 Base UI Field/Form/Input/Popover/Button，日期核心使用 `react-day-picker`；支持 `name`、`defaultValue`、清空、选择单日、提交 `YYYY-MM-DD`。
  - verify: 选择日期后隐藏字段或输入值能随表单提交；清空后提交空值；空态不报错。

- [x] T005 [US1, US4] 新增统一反馈组件
  - scope: `apps/web/src/components/ui/toast.tsx` 或 `apps/web/src/components/ui/feedback.tsx`, `apps/web/src/components/ui/index.ts`
  - detail: 基于 Base UI Toast 或可用反馈组件封装成功/失败提示；用于创建失败、日期校验、拖拽保存失败。
  - verify: 能从 client component 触发错误/成功反馈；无 Base UI Toast 时使用项目 wrapper 保持后续替换边界。

---

## Phase 2: 服务端稳定性与数据聚合

**目标**: 先修复创建阻断错误，并补 dashboard 图表需要的轻量统计。

- [x] T006 [US3] 修复 `replaceTaskKeyResultLinks` 事务返回 Promise 问题
  - scope: `apps/web/src/lib/services/task-service.ts`
  - detail: 将“删除旧链接 + 插入新链接”保留在事务内，避免事务回调直接返回异步查询 Promise；必要时把回读查询移到事务外。
  - verify: 新建任务并关联 0 个、1 个、多个 KR 都不触发 `Transaction function cannot return a promise`。

- [x] T007 [US3] 补充任务-KR 关联服务测试
  - scope: `apps/web/src/__tests__/tasks/task-service.test.ts`
  - detail: 覆盖空 KR、重复 KR 去重、多 KR 写入、回读一致性；同步修正现有测试中与当前中文错误文案不一致的问题，仅限相关断言。
  - verify: `pnpm test -- apps/web/src/__tests__/tasks/task-service.test.ts` 或等价 Vitest 过滤命令通过。

- [x] T008 [US5] 增加 dashboard 图表统计聚合
  - scope: `apps/web/src/lib/services/task-service.ts`, `apps/web/src/lib/services/review-service.ts`
  - detail: 为 `getDashboardSummary()` 增加任务状态分布或今日负载图所需字段；不新增表，不引入长期运营数据依赖。
  - verify: 空数据时返回 0 值结构；有数据时 counts 与现有列表来源一致。

- [x] T009 [US5] 补 dashboard summary 聚合测试
  - scope: `apps/web/src/__tests__/dashboard/dashboard-summary.test.ts`
  - detail: 覆盖新增 chart stats 的空态和非空态；保证原有 `currentPeriodSummary/todayTaskCounts/riskKeyResults/latestReview` 不回归。
  - verify: dashboard summary 测试通过。

---

## Phase 3: 任务创建与日期交互

**目标**: 把任务页创建/编辑改成 Base UI modal 和轻量表单，统一日期选择。

- [x] T010 [US1] 重构任务页创建/编辑状态为单一 modal 状态
  - scope: `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`
  - detail: 用 `taskModal = { mode: 'create' | 'edit', task?: TaskItem } | null` 替代页面内 `showCreateForm` 与独立编辑表单渲染；确保新建和编辑不会同时打开。
  - verify: 点击“新建任务”和“编辑”只打开 modal，不再向页面正文插入表单。

- [x] T011 [US1] 将 `TaskForm` 改为 modal 内轻量表单
  - scope: `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`, `apps/web/src/components/ui/*`
  - detail: 快速字段优先展示标题、状态、今日类型、排期/截止日期；备注、优先级、精力、KR、重要/紧急作为次级区域；表单控件走 Base UI wrappers。
  - verify: 最小必填信息可创建任务；高级字段仍可提交；取消关闭 modal 不污染列表布局。

- [x] T012 [US2] 替换任务表单日期字段为 `DatePickerField`
  - scope: `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`, `apps/web/src/components/ui/date-picker-field.tsx`
  - detail: 替换 `scheduledDate`、`dueDate`；保持服务端接收 `YYYY-MM-DD` 或空值；已排期状态下仍要求排期日期。
  - verify: 选择、修改、清空排期日期和截止日期后提交结果正确。

- [x] T013 [US2] 替换收件箱快速排期动作为统一日期选择交互
  - scope: `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`
  - detail: 移除列表卡片中散落的原生 `input[type="date"]`；改用 `DatePickerField` 或基于 Base UI Popover 的快速排期表单。
  - verify: 从收件箱排期任务成功后进入已排期列表；空日期提交有可见错误或被阻止。

- [x] T014 [US1, US3] 调整任务 action 错误返回与 modal 保留行为
  - scope: `apps/web/src/app/(dashboard)/tasks/actions.ts`, `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`
  - detail: 成功时关闭 modal；失败时 modal 保持打开并显示错误；保持 `revalidatePath('/tasks')` 和 `/okr` 行为。
  - verify: 标题为空、排期缺日期、服务端异常时 modal 不关闭；成功后关闭并刷新列表。

- [x] T015 [US1, US2, US3] 更新任务 action 测试
  - scope: `apps/web/src/__tests__/tasks/task-actions.test.ts`
  - detail: 覆盖创建最小任务、创建带 KR 任务、未授权、空标题、排期缺日期或服务端错误；同步当前实际错误文案。
  - verify: 任务 action 测试通过。

---

## Phase 4: 四象限拖拽

**目标**: 把四象限主交互从按钮切换改为拖动放置，并保留可访问替代操作。

- [x] T016 [US4] 调整 `updateTaskQuadrantAction` 返回结果以支持失败反馈
  - scope: `apps/web/src/app/(dashboard)/quadrants/actions.ts`
  - detail: 返回 `{ error?: string }` 或等价状态，保留审计日志和 `/quadrants`、`/dashboard`、`/tasks` revalidate；未授权和未找到任务需有稳定结果。
  - verify: 现有 quadrants action 测试更新后通过。

- [x] T017 [US4] 将四象限页改为 dnd-kit 拖放布局
  - scope: `apps/web/src/app/(dashboard)/quadrants/quadrants-client.tsx`
  - detail: 每个象限为 droppable；任务卡为 draggable；拖动结束后计算目标象限，optimistic move，调用 `updateTaskQuadrantAction`。
  - verify: 任务可从任一象限拖到另一个象限；刷新后仍在目标象限。

- [x] T018 [US4] 增加拖拽失败回退和可访问替代操作
  - scope: `apps/web/src/app/(dashboard)/quadrants/quadrants-client.tsx`, `apps/web/src/components/ui/*`
  - detail: 保存失败时回退本地位置并展示 Base UI 反馈；保留键盘/菜单式“移动到象限”替代入口。
  - verify: 模拟 action 返回错误时位置回退；无鼠标拖动能力时仍可移动象限。

- [x] T019 [US4] 更新四象限 action 测试
  - scope: `apps/web/src/__tests__/quadrants/quadrants-action.test.ts`
  - detail: 覆盖成功更新、未授权、服务返回 null、审计写入和 revalidate；如返回类型变化则同步断言。
  - verify: quadrants action 测试通过。

---

## Phase 5: Dashboard 图表与圆角收紧

**目标**: 让 dashboard 信息更直观，并收紧当前触达区域卡片圆角。

- [x] T020 [US5] 新增轻量图表组件或局部图表渲染函数
  - scope: `apps/web/src/app/(dashboard)/dashboard/page.tsx` 或 `apps/web/src/components/ui/*`
  - detail: 使用现有 summary 数据渲染至少一组图表，例如今日任务负载或任务状态分布；用 SVG/CSS/Tailwind 实现，不引入重型图表库。
  - verify: 空数据、单项数据、多项数据都能正常渲染，不出现除零或 NaN。

- [x] T021 [US5] 更新 dashboard 页面布局
  - scope: `apps/web/src/app/(dashboard)/dashboard/page.tsx`
  - detail: 保留现有摘要卡、风险 KR、今日快照、最近复盘语义；加入图表区域；避免卡片套卡片。
  - verify: dashboard 首屏加载正常，图表能反映新增 summary 数据。

- [x] T022 [US5] 收紧 dashboard/tasks/quadrants 触达区域圆角
  - scope: `apps/web/src/app/(dashboard)/dashboard/page.tsx`, `tasks/tasks-client.tsx`, `quadrants/quadrants-client.tsx`, 本次新增 UI wrappers
  - detail: 将主要卡片从 `rounded-2xl/rounded-xl` 下调一档，保持按钮和小控件可读；不做全站批量替换。
  - verify: 三个页面视觉一致，布局、点击区域和内容截断不回归。

---

## Phase 6: 集成验证与收尾

**目标**: 覆盖核心验收场景，确保实现可交付。

- [x] T023 [Verify] 执行单元测试
  - scope: `apps/web/src/__tests__`
  - detail: 跑任务、四象限、dashboard 相关测试；必要时扩大到全量 Vitest。
  - verify: `pnpm test` 通过，或记录明确失败原因并修复。

- [x] T024 [Verify] 执行类型检查和 lint
  - scope: workspace
  - detail: 验证新增依赖、Base UI wrappers、dnd-kit 类型和 React 19 用法。
  - verify: `pnpm typecheck` 与 `pnpm lint` 通过。

- [ ] T025 [Verify] 手动验收核心路径
  - scope: `/tasks`, `/quadrants`, `/dashboard`
  - detail: 验收新建 modal、快速创建、日期选择、创建带 KR、事务报错不复现、四象限拖拽、失败反馈、dashboard 图表和圆角。
  - verify: 对照 US1-US5 关键 Acceptance Scenarios 逐项通过。

- [x] T026 [Docs] 更新实现备注或验收记录
  - scope: `specs/improve-task-interactions/`
  - detail: 如执行中发现 Base UI/DayPicker/dnd-kit 约束或偏离计划，补充到实现记录或后续验收文档。
  - verify: 后续接手者能从 specs 目录理解实际实现边界。

---

## 依赖与顺序

- T001 是所有前端实现任务的前置。
- T002-T005 是 T010-T014、T018、T020-T022 的前置。
- T006-T007 是创建流程稳定性的关键路径，建议在任务页 UI 大改前完成。
- T008-T009 是 dashboard 图表的前置，可与任务页 UI 改造并行。
- T016 是 T017-T019 的前置。
- T020-T022 可在 T008-T009 后独立推进。
- T023-T026 是收尾验证，必须在主要实现完成后执行。

关键路径：

```text
T001 -> T002/T003/T004/T005 -> T006/T007 -> T010/T011/T012/T014/T015 -> T023/T024/T025
```

可并行：

```text
T008/T009, T016/T019, T020/T021/T022 可与任务页改造分支并行，但合并前需要统一 UI wrapper API。
```

---

## 覆盖检查

| 场景 / 需求 | 对应任务 |
|-------------|----------|
| US1 轻量 modal 创建任务 | T002, T003, T010, T011, T014, T015, T025 |
| US2 日期选择组件 | T004, T012, T013, T025 |
| US3 创建事务错误修复 | T006, T007, T014, T015, T025 |
| US4 四象限拖拽 | T005, T016, T017, T018, T019, T025 |
| US5 dashboard 图表与圆角 | T008, T009, T020, T021, T022, T025 |
| FR-014 Base UI 组件底座 | T001, T002, T003, T004, T005 |
| FR-015 react-day-picker 日期核心 | T001, T004, T012, T013 |
| 非范围：全站 Base UI 迁移 | 不在当前 tasks；后续新 feature |

---

## Notes

- 若实现阶段发现 Base UI 某个组件 API 不适配当前需求，优先调整项目 wrapper，不要让业务页面直接散落复杂 Base UI 组合。
- 日期值统一保持 `YYYY-MM-DD`，避免扩大到时区或自然语言日期解析。
- 图表只服务 dashboard 概览，不引入通用报表配置能力。
