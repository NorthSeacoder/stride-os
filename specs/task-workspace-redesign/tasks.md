# Tasks: 任务工作区与全局壳层重构

**Workspace**: `task-workspace-redesign` | **Date**: 2026-05-12  
**Input**: `specs/task-workspace-redesign/spec.md` + `plan.md`  
**Prerequisites**: spec.md (必须), plan.md (必须), data-model.md (按需)

---

## 执行原则

- 任务按依赖顺序组织，优先打通关键路径
- 每个任务都应是独立可验证的改动单元
- 先稳定全局壳层与数据基础，再重构任务页交互
- 每个阶段都包含局部验证，避免最后一次性堆积风险

---

## Phase 1: 全局壳层与任务域基础

**目标**: 先建立可承载三列任务页的新壳层与新数据结构，清掉后续实现的基础阻塞。

- [x] T001 [US1] 收紧 dashboard 全局壳层外层留白并调整主工作区容器宽度策略
  - scope: `apps/web/src/app/(dashboard)/layout.tsx`, `apps/web/src/app/globals.css`
  - verify: 本地查看 `/dashboard` 和 `/tasks`，确认主工作区更贴近视口边界，现有页面未出现明显遮挡或滚动异常

- [x] T002 [US1] 为左侧全局导航加入展开/收起双态与本地持久化
  - scope: `apps/web/src/app/(dashboard)/layout.tsx`, `apps/web/src/app/(dashboard)/dashboard-shell-nav.tsx`, 按需新增客户端壳组件
  - verify: 手动切换导航模式，刷新页面后状态保持；收起态下当前页面激活项仍可辨识

- [x] T003 [US3] 在数据库 schema 中新增任务清单、重复任务定义与定义-KR 默认关联结构，并重建任务实例字段边界
  - scope: `packages/db/src/schema/sqlite.ts`, `packages/db/src/schema/postgres.ts`, `packages/db/src/schema/index.ts`
  - verify: `pnpm typecheck` 通过；schema 导出可被 `@stride-os/db` 正常引用；定义/实例/清单字段与 `data-model.md` 对齐

- [x] T004 [US3] 为系统保留清单 `Inbox` 准备初始化入口，并明确新任务域下 OKR 关联的表级边界
  - scope: `packages/db` seed/setup 路径，相关 schema/relations
  - verify: 本地 setup/seed 后可确保 `Inbox` 存在；任务实例层和重复定义层 KR 关联可被服务层引用

---

## Phase 2: 服务层、查询层与 server actions

**目标**: 建立面向三列任务工作区的新服务接口，替换旧 `today/inbox/scheduled/done` 状态服务。

- [x] T005 [US3] 重写任务服务，提供第一栏来源、清单计数、第二栏分组查询和第三栏详情查询能力
  - scope: `apps/web/src/lib/services/task-service.ts`
  - verify: 服务层测试能覆盖来源列表、清单计数、按 `dueDate` 过滤智能视图、统一时间语义分组和始终存在的 `Completed` 分组

- [x] T006 [US6] 在任务服务中实现重复定义创建/更新与“确保当天实例存在”的幂等生成逻辑
  - scope: `apps/web/src/lib/services/task-service.ts`, 相关 db relations
  - verify: 同一重复定义同一天最多生成一条实例；定义更新只影响后续生成；必要的 KR 关联可复制到实例层

- [x] T007 [US4] 重写任务 server actions，替换旧状态迁移动作，改为清单创建、普通任务创建/更新、重复定义创建/更新、完成态切换
  - scope: `apps/web/src/app/(dashboard)/tasks/actions.ts`
  - verify: action 测试覆盖未授权、表单校验失败、普通任务成功提交、重复定义成功提交、完成态切换和错误返回

- [x] T008 [US2][US3][US4][US5] 重写任务页面服务端聚合入口，按三列工作区需要输出初始来源、初始任务列表和初始详情
  - scope: `apps/web/src/app/(dashboard)/tasks/page.tsx`, 按需涉及 dashboard/review 的任务依赖服务
  - verify: `/tasks` 首屏可获得第一栏来源、第二栏分组结果和第三栏初始空态/选中态所需数据；旧四视图取数链路不再被新页依赖

---

## Phase 3: 三列任务页与统一弹窗

**目标**: 完成第一栏、第二栏、第三栏及统一新建/编辑弹窗的前端重构，打通主要用户工作流。

- [x] T009 [US2][US3] 重写任务页客户端容器，建立三列布局、分隔线、第二/第三栏独立滚动和 sticky 顶部工具条
  - scope: `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`, 按需拆分子组件，`apps/web/src/app/globals.css`
  - verify: 本地查看 `/tasks`，确认三列稳定存在；第二栏和第三栏能独立滚动；顶部工具条在各自滚动容器内保持可见

- [x] T010 [US3][US4] 实现第一栏智能列表与真实清单区，支持来源切换、数量展示和新建清单入口
  - scope: `tasks-client.tsx` 及其来源导航子组件，`tasks/actions.ts`
  - verify: 点击“所有/今天/明天/收集箱/自定义清单”能切换第二栏标题与数据；无用户清单时仍能显示系统来源和新建入口

- [x] T011 [US4][US5] 实现第二栏任务主列表与第三栏详情联动，包括完成态迁移、清单标识显示和详情空态
  - scope: `tasks-client.tsx` 及任务列表/详情子组件
  - verify: checkbox 切换后任务进入当前来源的 `Completed` 分组；点击任务行可驱动第三栏显示标题和描述；无选中任务时显示空态

- [x] T012 [US6] 重构统一任务弹窗，补齐共享字段、快捷选日、日历选择、重复配置和清单选择
  - scope: `apps/web/src/app/(dashboard)/tasks/task-form-bridge.ts`, `tasks-client.tsx`, `apps/web/src/components/ui/date-picker-field.tsx`, `apps/web/src/components/ui/modal.tsx`
  - verify: 新建与编辑共用同一弹窗字段；日期快捷入口和日历均可用；启用重复时能输入频率与结束方式；失败时保留弹窗并展示错误

---

## Phase 4: 回归验证与依赖清理

**目标**: 补齐测试、清理旧依赖，并对 dashboard / review 等受影响路径做回归确认。

- [ ] T013 [US1][US2][US3][US4][US5][US6] 更新或新增任务域与任务页测试，覆盖关键故事和验收路径
  - scope: `apps/web/src/__tests__/tasks/*`, 按需扩展 dashboard/review 相关测试
  - verify: `pnpm test` 中任务域、任务页、actions、服务层相关测试通过

- [x] T014 [US1][US2][US4] 清理新任务页不再使用的旧任务状态视图依赖，并修正 dashboard/review 对任务统计的引用
  - scope: `apps/web/src/lib/services/task-service.ts`, `apps/web/src/lib/services/review-service.ts`, `apps/web/src/app/(dashboard)/dashboard/*`, 相关 presentation helpers
  - verify: `pnpm typecheck` 与 `pnpm lint` 通过；dashboard/review 不再依赖已废弃的旧任务视图函数

- [ ] T015 [US1][US2][US3][US4][US5][US6] 执行端到端人工验收并记录结果
  - scope: `/dashboard`, `/tasks`，必要时 `/review`
  - verify: 手动检查壳层留白、导航收展、三列滚动、来源切换、任务完成、详情联动、清单创建、重复任务创建与当天实例生成

---

## 依赖与顺序

- T001 和 T002 是 UI 壳层前置，决定任务页可用空间和导航交互基础。
- T003 和 T004 是数据层前置，没有它们就无法可靠开展服务层与 action 重写。
- T005、T006、T007、T008 构成任务域关键路径，必须先于三列 UI 完成。
- T009、T010、T011、T012 可以在统一数据接口稳定后并行穿插，但推荐按“容器骨架 → 来源栏 → 列表/详情 → 弹窗”顺序推进。
- T013、T014、T015 是收尾阶段，其中 T014 必须在主要实现完成后执行，避免旧依赖残留。

关键路径：

- T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015

---

## 覆盖检查

| 场景 / 需求 | 对应任务 |
|-------------|----------|
| US1 全局壳层收紧与导航收展 | T001, T002, T015 |
| US2 三列任务工作区 | T008, T009, T015 |
| US3 智能列表与真实清单 | T003, T004, T005, T010, T015 |
| US4 主列表完成、分组、快捷添加 | T005, T007, T011, T012, T015 |
| US5 详情栏联动与空态 | T008, T011, T015 |
| US6 统一弹窗与重复任务 | T006, T007, T012, T015 |
| FR-022 / FR-023 时间语义分组与 Completed 分组 | T005, T011, T013 |
| NFR-001 / NFR-002 布局可用性与效率优先 | T001, T002, T009, T015 |
| NFR-003 初版不做迁移 | T003, T004, T014 |

---

## Notes

- 当前任务拆解假设 `spec.md`、`plan.md`、`data-model.md` 已稳定，可直接进入实现。
- 若实现阶段发现 `Tomorrow` 对重复任务的显示策略需要改成“按视图日期补实例”，应在不改 spec 核心范围的前提下局部调整服务实现，并同步回写 plan/tasks。
- 若执行时发现旧任务状态相关代码在 dashboard/review 中耦合超预期，应优先补小范围适配层，而不是把旧状态模型带回新任务页。 
