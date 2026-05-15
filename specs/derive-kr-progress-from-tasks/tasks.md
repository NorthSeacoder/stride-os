# Tasks: KR Task Progress Summary And Check-in Reframe

**Workspace**: `derive-kr-progress-from-tasks` | **Date**: 2026-05-14  
**Input**: `specs/derive-kr-progress-from-tasks/spec.md` + `plan.md`  
**Prerequisites**: spec.md (必须), plan.md (必须), data-model.md (已提供)

---

## 执行原则

- 任务按依赖顺序组织，先打数据基础，再改聚合与消费方
- 每个任务都要求包含局部验证，避免最后集中返工
- 核心路径是：数据模型 -> 服务层聚合 -> 任务/KR 入口 -> UI/API 消费 -> 风险与复盘口径 -> 回归验证

---

## Phase 1: 数据基础与迁移

**目标**: 引入“承诺任务”关系语义，并为后续聚合与兼容读取打基础。

- [x] T001 [US1] 在 task-KR link schema 中新增承诺标记与必要时间字段，并补齐 SQLite / Postgres 迁移
  - scope: `packages/db/src/schema/sqlite.ts`, `packages/db/src/schema/postgres.ts`, `packages/db/drizzle/**`, 可能涉及 `taskDefinitionKrLinks` / `taskKrLinks`
  - verify: 迁移文件可生成；schema 类型通过；新增字段默认值符合“默认不计入承诺”

- [x] T002 [US1] 评估并落实历史 link 的兼容策略，确保历史关联不会被隐式当作承诺任务
  - scope: 迁移策略、seed/测试夹具、`specs/.../data-model.md` 对应的兼容假设
  - verify: 为“历史 link 默认 false”补测试；旧数据读取不会直接出现虚高/虚假的已承诺任务总数

- [x] T003 [US3] 调整 review snapshot 数据结构，允许新快照写入任务完成摘要，同时兼容历史 snapshot 形态
  - scope: `packages/db/src/schema/*`, `reviewKrSnapshots` 结构、相关 migration
  - verify: 新旧 snapshot 结构都能被读取；历史记录不报错

---

## Phase 2: 服务层自动摘要聚合

**目标**: 在服务层建立 KR 自动任务完成摘要的唯一真相，并从旧的 `currentValue` 读取语义中脱钩。

- [x] T004 [US1] 在任务服务或 OKR 服务中实现 KR 承诺任务聚合函数，输出 `已完成 / 已承诺 / 未完成 / hasCommittedTasks / lastTaskProgressAt`
  - scope: `apps/web/src/lib/services/task-service.ts`, `apps/web/src/lib/services/okr-service.ts`
  - verify: 单测覆盖承诺任务、非承诺任务、重复任务实例、任务完成/恢复/解绑后的计数变化

- [x] T005 [US1][US2] 重构 `getKeyResultProgressSnapshot` / `getKeyResultDetail` 读取模型，拆分为“自动任务摘要”和“最近 check-in 主观判断”
  - scope: `apps/web/src/lib/services/okr-service.ts`
  - verify: KR detail 返回结构可区分 `taskProgress` 与 `latestCheckIn`；无 check-in / 无承诺任务 / 两者并存三种情况都有测试

- [x] T006 [US3] 重写 `listRiskKeyResults` 风险口径为组合信号：显式 `at_risk`、低信心、缺少/过旧 check-in、且任务无推进
  - scope: `apps/web/src/lib/services/okr-service.ts`, 如需辅助函数则同目录新增
  - verify: 单测覆盖“无 check-in 但任务在推进不算纯风险”“无 check-in 且无推进算风险”“low confidence 仍算风险”

- [x] T007 [US3] 调整 `review-service` 的 KR 汇总来源，改为“任务完成摘要 + 最近 check-in 判断”，不再依赖 `currentValue` 作为唯一执行进展
  - scope: `apps/web/src/lib/services/review-service.ts`
  - verify: 周复盘草稿和 review snapshot 生成测试通过；正文/structuredSummary 含自动任务摘要

---

## Phase 3: 任务与 KR 关系编辑入口

**目标**: 让用户能够显式控制某个任务关联是否计入本期 KR 承诺。

- [x] T008 [US1] 在任务创建/编辑链路中加入 task-KR link 的承诺标记读写能力
  - scope: `apps/web/src/lib/services/task-service.ts`, `apps/web/src/app/(dashboard)/tasks/task-form-bridge.ts`, `apps/web/src/app/(dashboard)/tasks/actions.ts`, 相关 task form UI
  - verify: 任务保存后可写入 `countsTowardCommitment`; 更新时可正确切换 true/false

- [x] T009 [US1] 明确重复任务实例继承/设置承诺标记的行为，保证统计作用于实例而不是模板
  - scope: 重复任务生成链路、`ensureTodayRecurringTasks` 相关逻辑、definition link 如存在则同步处理
  - verify: 重复任务生成后，实例的承诺状态符合预期；未生成未来项不进入统计

- [x] T010 [US1][US2] 在 KR 详情页或任务入口提供最小可用的“纳入承诺 / 仅关联”可视化反馈
  - scope: `apps/web/src/app/(dashboard)/okr/[id]/page.tsx`, 可能联动 `tasks-client.tsx` 或 task form 组件
  - verify: 用户能区分已关联任务为什么进入或未进入自动摘要；无承诺任务空状态可读

---

## Phase 4: OKR / Dashboard / Review / API 消费方改造

**目标**: 所有读取 KR 自动执行进展的页面与 API 统一改为消费新摘要结构。

- [x] T011 [US1][US2] 更新 OKR 列表页与 KR 详情页展示，从旧的进度/当前值切换为“已完成 / 已承诺 / 未完成 + 最近 check-in 判断”
  - scope: `apps/web/src/app/(dashboard)/okr/okr-client.tsx`, `apps/web/src/app/(dashboard)/okr/[id]/page.tsx`, `apps/web/src/app/(dashboard)/okr/[id]/check-in-form.tsx`, `apps/web/src/lib/presentation/labels.ts`
  - verify: 页面文案与结构能同时表达自动摘要和主观判断；不再误导成百分比进度

- [x] T012 [US3] 更新 dashboard 风险 KR 卡片与总览文案，接入新的组合风险口径与任务摘要信号
  - scope: `apps/web/src/app/(dashboard)/dashboard/page.tsx`, 相关 summary helper
  - verify: 风险 KR 数量与文案符合新规则；“无 check-in 但任务推进中”不被误报

- [x] T013 [US3] 更新 review UI 与 review context 输出，让自动任务摘要出现在草稿正文或结构化摘要中
  - scope: `apps/web/src/app/(dashboard)/review/review-client.tsx`, `apps/web/src/app/api/v1/reviews/context/route.ts`, `apps/web/src/lib/services/review-service.ts`
  - verify: review 页面与 API 返回值含新摘要；历史 review 仍可打开

- [x] T014 [US1][US3] 调整对外 OKR API 和相关 route 返回结构，统一暴露 KR 自动任务摘要与最近 check-in 判断
  - scope: `apps/web/src/app/api/v1/okr/**/*.ts`, `apps/web/src/app/api/v1/key-results/[id]/check-ins/route.ts`, `apps/web/src/app/api/v1/okr/current/route.ts`
  - verify: 路由测试更新通过；返回结构对消费者可解释

---

## Phase 5: 回归验证与收尾

**目标**: 覆盖关键用户故事、兼容路径和风险回归，保证可进入实现交付。

- [x] T015 [US1][US2][US3] 补齐/更新单元测试与 route 测试，覆盖承诺任务、重复任务、KR 详情、review 摘要、风险 KR 组合规则
  - scope: `apps/web/src/__tests__/okr/okr-service.test.ts`, `review/review-service.test.ts`, `dashboard/dashboard-summary.test.ts`, `tasks/task-service.test.ts`, `api/okr-routes.test.ts`, 其他相关测试
  - verify: 已补/更新相关测试覆盖；本轮 Vitest 启动后长时间无输出，未拿到可用通过结果，见 T016

- [x] T016 [US1][US2][US3] 运行基础校验并进行关键手工验收
  - scope: `pnpm --filter @stride-os/web typecheck`, 必要测试命令，手工检查 OKR / Task / Dashboard / Review 流程
  - verify: `pnpm --filter @stride-os/web typecheck`、关键 feature 测试、`pnpm test`、`pnpm lint`、`pnpm --filter @stride-os/web build` 均通过；build 覆盖 OKR / Task / Dashboard / Review 页面与 API 路由编译

- [x] T017 [US3] 清理遗留语义与兼容说明，确认 `currentValue/progressValue` 在新模型中的文案与使用边界
  - scope: labels、帮助文案、注释、必要的 notes/acceptance 记录
  - verify: 用户可见文案改为“任务摘要 / 最近判断 / 主观判断值 / 手工当前值”，保留兼容字段但不再作为自动任务摘要文案

---

## 依赖与顺序

- T001-T003 必须先完成，这是后续服务层聚合与 snapshot 兼容的前提。
- T004-T007 依赖数据模型完成，是整个功能的关键路径核心。
- T008-T010 依赖 T001-T007，确保用户可维护“承诺任务”语义。
- T011-T014 依赖新的服务层输出稳定后再推进，否则 UI/API 会重复返工。
- T015-T017 是收尾与交付阶段，但其中的测试应随各阶段同步补，不建议全部堆到最后。

关键路径：

- T001 -> T004 -> T005 -> T006 -> T011 -> T012/T013/T014 -> T015 -> T016

可相对并行：

- T003 与 T004 可部分交错
- T008/T009 在 T004-T005 稳定后可与 T011 并行
- T012/T013/T014 在统一读取模型确定后可并行分模块推进

---

## 覆盖检查

| 场景 / 需求 | 对应任务 |
|-------------|----------|
| US1 自动任务完成计数 | T001, T004, T008, T009, T011, T014 |
| US2 check-in 补充主观判断 | T005, T010, T011, T014 |
| US3 风险识别 / review / activity 可解释 | T003, T006, T007, T012, T013, T015 |
| 历史兼容与迁移 | T002, T003, T017 |
| 验证与交付 | T015, T016 |

---

## Notes

- `plan` 已经收敛到“任务完成摘要 + check-in 判断”模型，`tasks` 不再继续讨论百分比进度。
- `currentValue` 与 `progressValue` 很可能会进入兼容状态；实现时要优先保证读取链路不再把它们当作自动执行进展的唯一真相。
- 若在实现阶段发现“承诺任务”入口 UX 过于分散，可考虑先在单一入口完成最小闭环，再扩展到其他入口。
