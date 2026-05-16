# Tasks: Import 2026 OKR Data

**Workspace**: `import-2026-okr-data` | **Date**: 2026-05-15  
**Input**: `specs/import-2026-okr-data/spec.md` + `plan.md`  
**Prerequisites**: spec.md (必须), plan.md (必须), data-model.md (暂不需要)

---

## 执行原则

- 先修枚举和契约，再做清理脚本，最后做导入脚本。
- 所有生产破坏性动作必须先支持 dry-run。
- 默认保留用户、认证、token、session、audit logs 和系统 inbox。
- 本任务清单只描述后续实现，不在本阶段执行清库或导入。

---

## Phase 1: Enum and Contract Alignment

**目标**: 消除 period 枚举在 service、DB、OpenAPI 之间的漂移，为 2026 年度周期导入打基础。

- [x] T001 [US1] 盘点并确认 period type/status 的真实枚举来源
  - scope: `apps/web/src/lib/services/okr-service.ts`, `packages/db/src/schema/sqlite.ts`, `packages/db/src/schema/postgres.ts`, `packages/api-contract/src/v1/openapi.ts`, existing migrations
  - verify: 记录当前 service/db/openapi 差异，确认 2026 导入使用 `type = "year"`

- [x] T002 [US1] 对齐 OpenAPI 的 OKR period 枚举
  - scope: `packages/api-contract/src/v1/openapi.ts`
  - verify: `OkrPeriod` 和 `OkrPeriodWriteRequest` 的 `type/status` 与 service/db 一致

- [x] T003 [US1] 按需补 DB migration 或 schema 约束
  - scope: `packages/db/src/schema/sqlite.ts`, `packages/db/src/schema/postgres.ts`, `packages/db/drizzle/sqlite/*`, `packages/db/drizzle/postgres/*`
  - verify: SQLite 和 Postgres 的 check constraints 均接受实际枚举；如无需迁移，明确记录无需变更原因

- [x] T004 [US1] 更新枚举相关测试
  - scope: `packages/api-contract/src/__tests__/openapi.test.ts`, relevant DB/service tests
  - verify: contract test 能捕捉 period 枚举漂移；相关测试通过

---

## Phase 2: Cleanup Safety Tooling

**目标**: 提供可预览、可确认、可验证的生产业务数据清理能力。

- [x] T005 [US2] 定义业务数据清理表和保留表清单
  - scope: `packages/db/src/schema/*`, `packages/db/src/seed.ts`, `specs/import-2026-okr-data/plan.md`
  - verify: 清理表包含 OKR、任务、复盘、示例业务数据；保留表包含用户、认证、token、audit logs、系统 inbox

- [x] T006 [US2] 实现 cleanup dry-run 统计
  - scope: `packages/db/scripts/cleanup-business-data.ts`
  - verify: dry-run 输出 database driver、database URL/schema、每张目标表记录数，不删除任何数据

- [x] T007 [US2] 实现 cleanup 执行模式和确认门槛
  - scope: `packages/db/scripts/cleanup-business-data.ts`, `packages/db/package.json`
  - verify: 未传显式确认参数时拒绝删除；传确认参数后按依赖顺序清理业务数据

- [x] T008 [US2] 为 cleanup 增加测试或本地演练脚本
  - scope: `packages/db/src/__tests__/*` or scripted SQLite fixture
  - verify: 验证 dry-run 不删除、执行模式删除业务数据、系统 inbox 和用户/token 数据保留

---

## Phase 3: 2026 OKR Source Data Preparation

**目标**: 把旧 H1 JSON/Markdown 调整为 2026 全年导入源，并按 `清单 -> 清单内 Objective -> Objective 内 KR` 的层级整理。

- [x] T009 [US3] 生成 2026 全年 OKR JSON 草稿
  - scope: `okr-2026-h1.json`, `/Users/yqg/learning/biji/note/07-个人目标/2026年上半年/2026年1-6月个人OKR.md`, new `okr-2026.json` location
  - verify: period 改为 `name = "2026"`, `type = "year"`, `startDate = "2026-01-01"`, `endDate = "2026-12-31"`

- [x] T010 [US3] 收口并冻结 task list 命名和 slug
  - scope: 2026 OKR JSON source
  - verify: 清单至少包含 `civil-service-exam`, `health-repair`, `content-business`, `personal-operations`；不单独创建 `daily` 清单

- [x] T011 [US3] 按 task list 分组整理 Objective
  - scope: 2026 OKR JSON source
  - verify: 每个 Objective 必须归属一个 `taskListSlug`；同一清单内 Objective 有稳定 `refId` 和 `sortOrder`

- [x] T012 [US3] 按 Objective 分组整理 KR
  - scope: 2026 OKR JSON source
  - verify: 每个 KR 必须归属一个 Objective；同一 Objective 内 KR 有稳定 `refId`、`type`、`targetValue/currentValue`、`unit`、`status` 和 `confidence`

- [x] T013 [US3] 校验清单、Objective、KR 的唯一性和字段枚举
  - scope: 2026 OKR JSON source, import validation helper
  - verify: task list slug 唯一；Objective refId 全局唯一；KR refId 全局唯一；KR status 使用 `active/at_risk/done/archived`；period/task list/KR 类型符合当前 schema

---

## Phase 4: Direct DB Import

**目标**: 实现可幂等的直接写库导入脚本，执行顺序固定为：先导入清单，再导入每个清单的 Objective，再导入每个 Objective 的 KR。

- [x] T014 [US3] 实现 import JSON validation-only 模式
  - scope: `packages/db/scripts/import-2026-okr.ts`
  - verify: 能读取 JSON，输出规范化后的 list/objective/KR 数量和字段错误，不写数据库

- [x] T015 [US3] 实现 task list upsert/import
  - scope: `packages/db/scripts/import-2026-okr.ts`, `task_lists`
  - verify: 按 slug 创建或复用 user task lists；系统 inbox 不受影响

- [x] T016 [US3] 实现 2026 period upsert/import
  - scope: `packages/db/scripts/import-2026-okr.ts`, `periods`
  - verify: 创建或复用 2026 period；重复执行不重复创建

- [x] T017 [US3] 实现按清单导入 Objective
  - scope: `packages/db/scripts/import-2026-okr.ts`, `objectives`
  - verify: 逐个 task list 处理其 Objective；Objective 写入 2026 period；manifest 能记录 Objective refId、taskListSlug 和 objectiveId

- [x] T018 [US3] 实现按 Objective 导入 KR
  - scope: `packages/db/scripts/import-2026-okr.ts`, `key_results`
  - verify: 逐个 Objective 处理其 KR；KR 写入对应 objectiveId；重复执行不重复创建

- [x] T019 [US3] 输出分层 import manifest
  - scope: generated manifest path under ignored/local artifact location
  - verify: manifest 包含 periodId、taskList slug 到 id、每个清单下的 Objective refId 到 id、每个 Objective 下的 KR refId 到 id

- [x] T020 [US3] 为 import 增加测试或本地 SQLite 演练
  - scope: `packages/db/src/__tests__/*` or scripted SQLite fixture
  - verify: validation-only、首次导入、重复导入、分层 manifest 输出均通过

---

## Phase 5: Verification and Runbook

**目标**: 收口实际执行前的验证步骤和生产操作说明。

- [x] T021 [US1] [US2] [US3] 运行质量检查
  - scope: repo root
  - verify: 至少运行 `pnpm typecheck` 和相关测试；如无法完整运行，记录原因和局部验证结果

- [x] T022 [US2] [US3] 编写生产执行 runbook
  - scope: `specs/import-2026-okr-data/acceptance.md` or `docs/`
  - verify: runbook 包含备份、cleanup dry-run、cleanup confirm、import validation、import execute、post-import query 校验步骤

- [x] T023 [US3] 本地完整演练
  - scope: local SQLite dev DB or disposable DB
  - verify: 清理业务数据后按 `清单 -> Objective -> KR` 顺序导入 2026 OKR；DB 演练与 manifest 已完成，页面/API 抽检步骤已写入 `acceptance.md`

- [x] T024 [US2] [US3] 生产执行前人工确认点
  - scope: production database target
  - verify: 在真正执行前向用户展示目标库、dry-run 记录数、备份状态和即将导入的 2026 JSON 摘要

---

## 依赖与顺序

- T001-T004 必须先完成，避免导入源和契约不一致。
- T005-T008 必须先于任何生产清理。
- T009-T013 必须先于导入脚本执行，但可以和 cleanup 脚本实现并行推进。
- T014-T020 依赖 2026 JSON 字段基本稳定，且必须按 `清单 -> period -> Objective -> KR -> manifest` 顺序实现。
- T021-T024 是执行前收口，不应跳过。

---

## 覆盖检查

| 场景 / 需求 | 对应任务 |
|-------------|----------|
| US1 枚举对齐 | T001, T002, T003, T004 |
| US2 生产业务数据清理 | T005, T006, T007, T008, T022, T024 |
| US3 2026 全年 OKR 导入 | T009, T010, T011, T012, T013, T014, T015, T016, T017, T018, T019, T020, T023, T024 |
| FR-009 只计划到 tasks | 本阶段只创建 spec/plan/tasks，不执行实现 |

---

## Notes

- `eventTags`、KR `description` 和 `refId` 默认保留在 JSON/manifest 中，不写入现有 OKR 表。
- 如果实现阶段要把 `eventTags` 或 KR `description` 入库，应先补 data-model 和 migration 任务。
- 生产执行需要单独确认，不能由 tasks 阶段自动触发。
- Phase 1 已确认 DB schema 与 service 枚举一致，因此本轮未新增 period migration。
- `docs/data/okr-2026.json` 已作为新的年度导入源；旧 `okr-2026-h1.json` 保留作对照，不作为后续导入输入。
