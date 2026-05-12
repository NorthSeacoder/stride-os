# Tasks: 四象限任务视图重构

**Workspace**: `rebuild-task-quadrants` | **Date**: 2026-05-12  
**Input**: `specs/rebuild-task-quadrants/spec.md` + `plan.md`  
**Prerequisites**: spec.md (必须), plan.md (必须), data-model.md (按需)

---

## 执行原则

- 先清理旧模型，再实现新规则，最后重写页面交互
- 优先打通“规则计算 + 拖拽回写 + 新建默认值”关键路径
- 四象限页与任务页共享的表单 / action 改动要一起验证，避免只修一边
- 所有关键规则都必须补测试，不允许只靠人工拖一遍

---

## Phase 1: 清理旧模型与建立新规则基础

**目标**: 移除 `important/urgent`，建立以 `priority + dueDate` 为中心的四象限规则和数据前提。

- [x] T001 [US2] 从 SQLite / Postgres schema 中删除 `tasks.important`、`tasks.urgent` 及相关索引，并同步更新 schema 导出
  - scope: `packages/db/src/schema/sqlite.ts`, `packages/db/src/schema/postgres.ts`, `packages/db/src/schema/index.ts`
  - verify: `pnpm typecheck` 通过；schema 中不再导出或引用旧字段

- [x] T002 [US2] 更新本地数据准备路径，允许清空旧任务数据并以新 schema 重建开发环境
  - scope: `packages/db` migrate / seed / setup 相关脚本与说明
  - verify: 本地可执行一次数据库重建流程；旧任务数据不再阻塞新结构

- [x] T003 [US2] 在任务服务层实现四象限纯规则函数：日历日差、紧急度、象限映射、默认反演表
  - scope: `apps/web/src/lib/services/task-service.ts`
  - verify: 单测覆盖 `D <= 7`、`D > 7`、无截止日期映射、Q1~Q4 反演默认值、“今天 + P1 -> Q1”、“约 1 个月后 + null -> Q4`

---

## Phase 2: 服务层与共享任务写入链路

**目标**: 让四象限页读取和修改都只经过新的任务真相字段。

- [x] T004 [US1][US2][US5] 重写四象限查询服务，返回固定四象限顺序、按清单分组的未完成/已完成任务聚合结构
  - scope: `apps/web/src/lib/services/task-service.ts`
  - verify: 服务测试覆盖四象限顺序、空象限、清单分组、已完成开关所需分组结构

- [x] T005 [US4] 实现四象限拖拽写入服务：跨象限写 `priority + dueDate`，同象限跨清单只写 `listId`
  - scope: `apps/web/src/lib/services/task-service.ts`
  - verify: 单测覆盖跨象限后规则结果命中目标象限、跨清单后象限不变、异常路径回传错误

- [x] T006 [US3][US4] 重写四象限 server actions，移除 `important/urgent` 输入并接入新的查询/回写服务
  - scope: `apps/web/src/app/(dashboard)/quadrants/actions.ts`, `apps/web/src/__tests__/quadrants/quadrants-action.test.ts`
  - verify: action 测试覆盖未授权、任务不存在、跨象限成功、跨清单成功、路径 revalidate 正确

- [x] T007 [US3] 扩展共享任务创建/编辑链路，补齐 `priority` 字段的 form bridge、action 解析和任务更新写入
  - scope: `apps/web/src/app/(dashboard)/tasks/task-form-bridge.ts`, `apps/web/src/app/(dashboard)/tasks/actions.ts`, 按需涉及 `tasks-client.tsx`
  - verify: 任务表单相关测试覆盖 `priority` 默认值透传、创建/更新时成功落库

---

## Phase 3: 四象限页面 UI 重写

**目标**: 完成四宫格布局、顶部菜单、分组列表、checkbox/编辑/拖拽交互。

- [x] T008 [US1][US5] 重写四象限页面服务端入口和客户端容器，建立标题、`...` 菜单、“显示已完成”状态和 2×2 均分 grid
  - scope: `apps/web/src/app/(dashboard)/quadrants/page.tsx`, `apps/web/src/app/(dashboard)/quadrants/quadrants-client.tsx`
  - verify: 手动查看 `/quadrants`，确认四宫格顺序、标题、菜单和空态符合 spec

- [x] T009 [US1][US5] 在每个象限内实现按清单分组的未完成区和独立已完成折叠区
  - scope: `quadrants-client.tsx`，按需拆分局部子组件
  - verify: 某象限存在多个清单与已完成任务时，组头计数、折叠与显示开关表现正确

- [x] T010 [US3] 接入每象限右上角“新建任务”入口，并向统一任务弹窗注入该象限默认 `priority + dueDate`
  - scope: `quadrants-client.tsx`, 共享任务表单组件 / modal 复用链路
  - verify: 从 Q1/Q2/Q3/Q4 各新建一条任务，保存后分别落回目标象限

- [x] T011 [US3][US4] 实现任务行交互分离：checkbox 切换完成、正文点击编辑、其余区域支持整行拖动
  - scope: `quadrants-client.tsx`
  - verify: 手动验收单击 checkbox 不误拖，单击正文打开编辑，拖动整行可进入拖拽态

- [x] T012 [US4] 实现跨象限拖拽与同象限跨清单拖拽的 optimistic UI、错误回滚和空组放置目标
  - scope: `quadrants-client.tsx`, `quadrants/actions.ts`
  - verify: 手动拖拽到其他象限、空清单组、同象限其他清单，结果与 spec 一致；失败时 UI 回退

---

## Phase 4: 回归与清理

**目标**: 清除旧四象限残留，补齐自动化验证和人工验收。

- [x] T013 [US1][US2][US3][US4][US5] 更新或新增四象限与任务模块测试，移除一切对 `important/urgent` 的旧断言
  - scope: `apps/web/src/__tests__/quadrants/*`, `apps/web/src/__tests__/tasks/*`
  - verify: `pnpm test` 中四象限与任务相关测试通过

- [x] T014 [US2] 清理 API、服务、类型和页面中残留的旧四象限命名与旧字段引用
  - scope: `apps/web/src/app/api/v1/tasks/quadrants/route.ts`, `apps/web/src/lib/services/task-service.ts`, 相关类型定义
  - verify: `rg -n "important|urgent" apps/web packages/db` 仅剩非任务无关语义或 0 结果；`pnpm typecheck` 通过

- [ ] T015 [US1][US3][US4][US5] 执行人工验收并记录结果
  - scope: `/quadrants`, 按需联动 `/tasks`
  - verify: 完成以下验收：四宫格布局、显示已完成开关、新建默认落象限、checkbox 完成切换、点击编辑、跨象限拖拽、同象限跨清单拖拽、跨日规则复核

---

## 依赖与顺序

- T001 与 T002 是所有实现前置，不清掉旧字段和旧数据，后续服务层会持续被旧模型干扰。
- T003 是规则核心，T004/T005/T006/T010/T012 都依赖它。
- T007 必须早于 T010，否则四象限无法通过共享弹窗正确写入 `priority`。
- T008 是 UI 骨架前置，T009/T010/T011/T012 在其后推进。
- T013/T014/T015 属于收尾，但 T014 不应拖到最后才做，否则旧字段残留会放大调试成本。

关键路径：

- T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015

---

## 覆盖检查

| 场景 / 需求 | 对应任务 |
|-------------|----------|
| US1 四宫格浏览与分组 | T004, T008, T009, T015 |
| US2 统一规则计算象限 | T001, T002, T003, T013, T014 |
| US3 象限内新建与编辑 | T007, T010, T011, T015 |
| US4 拖拽跨象限 / 跨清单 | T005, T006, T011, T012, T015 |
| US5 显示已完成开关 | T004, T008, T009, T015 |
| FR-014 / FR-015 阈值与无截止日期规则 | T003, T013 |
| FR-019 唯一默认反演表 | T003, T005, T010 |
| FR-025 / FR-026 删除旧模型和清空旧数据 | T001, T002, T014 |

---

## Notes

- 若实现中发现任务页共享弹窗难以直接复用，可在不分叉 server action 的前提下抽出共享 `TaskForm` 组件；这属于实现细化，不改变 plan 核心决策。
- 跨日自动迁移的实现标准是“重新读取时结果变化”，不是新增后台任务。
