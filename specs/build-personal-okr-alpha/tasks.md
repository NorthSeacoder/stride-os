# Tasks: Personal OKR Alpha

**Workspace**: `stride-os` | **Date**: 2026-05-09  
**Input**: `specs/build-personal-okr-alpha/spec.md` + `plan.md`  
**Prerequisites**: spec.md (必须), plan.md (必须), data-model.md (已提供)

---

## Phase 1: Data Foundation

**目标**: 先把 OKR 领域数据落到数据库和共享查询边界，保证后续 UI/API 复用同一真源。

- [x] T001 [US3] [US5] 在 SQLite 和 Postgres schema 中加入 OKR 核心表
  - scope: `packages/db/src/schema/sqlite.ts`, `packages/db/src/schema/postgres.ts`
  - verify: schema 文件包含 `periods`, `objectives`, `key_results`, `kr_check_ins`, `tasks`, `task_kr_links`, `reviews`, `review_kr_snapshots`

- [x] T002 [US3] [US5] 补齐数据库索引、关系和导出入口
  - scope: `packages/db/src/schema/index.ts`, schema relations, 相关 migrations/seed 入口
  - verify: schema 可被现有 db build / migrate 流程识别，双驱动结构保持一致

- [x] T003 [US3] [US5] 为 OKR 数据模型补最小 smoke test 和 schema 约束验证
  - scope: `packages/db/src/__tests__/*`, `packages/db/src/schema/*`
  - verify: 关键表结构、唯一性、时间字段和关系在测试里被覆盖

---

## Phase 2: Shared Domain Services

**目标**: 把业务规则集中到共享 service 层，避免 UI 和 API 各写一套逻辑。

- [x] T004 [US1] [US2] [US3] [US5] 建立 OKR / Task / Review 共享 service 层
  - scope: `apps/web/src/lib/services/*`
  - verify: 任务、KR check-in、review draft/final、dashboard summary 的查询与写入都能从 service 层调用

- [x] T005 [US1] [US2] [US3] 固化任务状态规则和 Today 分组规则
  - scope: `apps/web/src/lib/services/*`, task 状态 helpers
  - verify: inbox -> today -> done / canceled 的规则与 `todayType = must | focus` 的约束可被 service 强制

- [x] T006 [US2] [US3] 固化 KR check-in 和进度来源规则
  - scope: `apps/web/src/lib/services/*`, KR helpers
  - verify: KR 最终进度只由 check-in 读取，不从任务完成数自动推断

---

## Phase 3: Task-first UI

**目标**: 先让用户每天能在 `/tasks` 完成实际输入和整理，Today 作为默认入口。

- [x] T007 [US1] 把 `/tasks` 做成 Today-first 页面，并接入 Inbox / Scheduled / Done 视图
  - scope: `apps/web/src/app/(dashboard)/tasks/*`
  - verify: 打开 `/tasks` 默认落在 Today；Today 页面按 Must / Focus 分组

- [x] T008 [US1] 实现任务创建、编辑、完成、取消与 Today / Inbox / Scheduled 的状态切换
  - scope: `apps/web/src/app/(dashboard)/tasks/*`, server actions
  - verify: 新任务默认进 Inbox；加入 Today 时必须选择 Must 或 Focus；完成后记录 completedAt

- [x] T009 [US2] 实现任务详情里的 KR 关联和 KR 详情里的任务列表
  - scope: `apps/web/src/app/(dashboard)/tasks/*`, `apps/web/src/app/(dashboard)/okr/*`
  - verify: 一个任务可关联多个 KR；KR 详情能看到关联任务

- [x] T010 [US1] [US2] 为任务视图补最小局部测试
  - scope: `apps/web/src/__tests__/*`, task service / action tests
  - verify: Today 默认入口、Must/Focus 约束、任务关联 KR 的关键路径有测试覆盖

---

## Phase 4: OKR and Review Loop

**目标**: 把 OKR、check-in、review 串成闭环，形成周复盘能力。

- [x] T011 [US3] 实现周期 / Objective / KR 的 CRUD 页面与表单流
  - scope: `apps/web/src/app/(dashboard)/okr/*`
  - verify: 可创建周期、Objective、KR，并在页面中查看层级关系

- [x] T012 [US3] 实现 KR check-in 提交与历史展示
  - scope: `apps/web/src/app/(dashboard)/okr/*`, shared services
  - verify: 可写入 progressValue、confidence、summary、blockers、nextActions，并回看历史

- [x] T013 [US5] 实现周复盘草稿生成、编辑、保存为 draft / final
  - scope: `apps/web/src/app/(dashboard)/review/*`
  - verify: 可生成 weekly draft，可保存为 review，且可切换为 final

- [x] T014 [US5] 为 review save/finalize 和 KR snapshot 增加测试
  - scope: `apps/web/src/__tests__/api/*`, review service / route tests
  - verify: draft 保存、final 化、同周重复保存、snapshot 保留行为都有验证

---

## Phase 5: Quadrants and Dashboard

**目标**: 在核心闭环稳定后，再做派生视图和聚合首页。

- [x] T015 [US4] 实现四象限任务视图
  - scope: `apps/web/src/app/(dashboard)/quadrants/*`
  - verify: 按 important / urgent 展示任务，并支持查看已完成任务的历史状态

- [x] T016 [US4] 实现四象限中的重要性 / 紧急性调整
  - scope: `apps/web/src/app/(dashboard)/quadrants/*`, task service
  - verify: 调整只改 important / urgent，不改任务状态

- [x] T017 [US6] 用聚合查询替换当前 Dashboard 占位页
  - scope: `apps/web/src/app/(dashboard)/dashboard/page.tsx`, aggregation helpers
  - verify: Dashboard 显示当前周期、Today 任务、风险 KR、最近 review

- [x] T018 [US6] 为 Dashboard 聚合结果补最小验证
  - scope: `apps/web/src/__tests__/*`, aggregation helper tests
  - verify: 空数据、部分数据、有风险 KR 三类场景都能稳定返回

---

## Phase 6: Hermes API Surface

**目标**: 把同一套业务能力暴露成稳定 v1 API，供 Hermes agent 使用。

- [x] T019 [US5] [US6] 扩展 `packages/api-contract` 的 v1 OpenAPI 定义
  - scope: `packages/api-contract/src/v1/openapi.ts`
  - verify: 增加 current OKR、task queries、KR check-in、weekly review draft/save/update 的 schema 和路径

- [x] T020 [US5] [US6] 实现 `/api/v1` 的 OKR / Task / Review route handlers
  - scope: `apps/web/src/app/api/v1/*`
  - verify: 通过 PAT 可读写同一套 service；接口返回 JSON 与 contract 一致

- [x] T021 [US5] [US6] 为 API route handlers 补认证和契约测试
  - scope: `apps/web/src/__tests__/api/*`
  - verify: bearer PAT 和 cookie/session 路径都可通过，未授权请求返回 401

---

## Phase 7: Final Verification and Cleanup

**目标**: 收口、跑通、确认 Alpha 的关键验收路径。

- [ ] T022 [US1] [US2] [US3] [US4] [US5] [US6] 跑通端到端手工验收清单
  - scope: browser + app routes
  - verify: 创建任务 -> 加入 Today -> 关联 KR -> check-in -> 生成 weekly draft -> 保存 final -> 查看 Dashboard

- [ ] T023 [all] 跑完整体质量检查
  - scope: repo root
  - verify: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` 至少能定位到新增问题；修掉实现范围内的阻塞错误

---

## 依赖与顺序

- T001-T003 必须先完成，后续 service / UI / API 都依赖稳定数据模型。
- T004-T006 是业务规则的单一来源，后续所有页面和 route handler 都应复用。
- T007-T010 先落 Task，因为它是 Daily entry point。
- T011-T014 再做 OKR + review 闭环。
- T015-T018 属于派生视图和聚合页，可在核心闭环稳定后推进。
- T019-T021 依赖前面的 service 和数据模型。
- T022-T023 是关键路径完成后的收口验证。

---

## 覆盖检查

| 场景 / 需求 | 对应任务 |
|-------------|----------|
| US1 Today-first task flow | T005, T007, T008, T010 |
| US2 Task to KR linking | T006, T009, T010 |
| US3 OKR + KR check-in | T004, T006, T011, T012 |
| US4 Quadrants | T015, T016 |
| US5 Weekly review draft/save/final | T004, T013, T014, T019, T020, T021 |
| US6 Dashboard summary | T017, T018 |

---

## Notes

- 任务已经按依赖顺序排好，第一批关键路径是数据模型、共享 service、Tasks、OKR/review、API contract。
- 如果实现过程中发现 schema 需要补字段，优先回到 T001-T003 阶段修正，不要绕过 service 直接在 UI 层打补丁。
