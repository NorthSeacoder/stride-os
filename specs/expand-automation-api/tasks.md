# Tasks: Expand Automation API

**Feature**: `expand-automation-api`  
**Spec**: [spec.md](spec.md)  
**Plan**: [plan.md](plan.md)  
**Data Model**: [data-model.md](data-model.md)

## 执行原则

- 按顺序执行；后续 API route 依赖前置 validation、archive 语义和服务层能力。
- 每个阶段完成后跑对应局部测试；不要等到最后才补验证。
- Route handlers 保持薄层：认证、校验、调用 service、审计、JSON 响应。
- MVP 不做 token scope、批量接口和 idempotency key。

## Phase 1: API 基础设施

**目标**: 先统一 API 错误、请求解析和测试基线，避免后续每个 route 重复实现。

- [x] T001 [Setup] 扩展 API validation/error helper，统一 JSON `401/400/404/409` 响应。
  - scope: `apps/web/src/app/api/_lib/validation.ts` 或新增相邻 helper
  - verify: 新增/更新 `apps/web/src/__tests__/api/route-validation.test.ts`

- [x] T002 [Setup] 增加 API route 测试工具，封装 Bearer auth mock、JSON request 构造和常见断言。
  - scope: `apps/web/src/__tests__/api/*`
  - verify: 现有 api route tests 仍能通过

- [x] T003 [Setup] 明确 mutation audit helper 或复用现有插入模式，保证新增写接口都有审计记录。
  - scope: `apps/web/src/app/api/_lib/*`, 新增 route handlers
  - verify: route tests 断言关键写操作调用 audit insert 或产生预期记录

## Phase 2: 归档数据语义

**目标**: 让 task/review 支持归档，OKR 继续使用已有 archived 状态。

- [x] T004 [Data] 为 `tasks` 增加归档语义，并同步 SQLite/Postgres schema 与迁移。
  - scope: `packages/db/src/schema/sqlite.ts`, `packages/db/src/schema/postgres.ts`, `packages/db/migrations/*`
  - verify: schema/migration 测试或 `pnpm db:migrate` 可通过

- [x] T005 [Data] 为 `reviews` 增加归档语义，并同步 SQLite/Postgres schema 与迁移。
  - scope: `packages/db/src/schema/sqlite.ts`, `packages/db/src/schema/postgres.ts`, `packages/db/migrations/*`
  - verify: schema/migration 测试或 `pnpm db:migrate` 可通过

- [x] T006 [Services] 在 task service 增加归档 helper，并确保默认 task 查询排除 archived。
  - scope: `apps/web/src/lib/services/task-service.ts`
  - verify: `apps/web/src/__tests__/tasks/task-service.test.ts`

- [x] T007 [Services] 在 review service 增加归档 helper，并确保默认 review 列表排除 archived。
  - scope: `apps/web/src/lib/services/review-service.ts`
  - verify: `apps/web/src/__tests__/review/review-service.test.ts`

## Phase 3: Task Automation API

**目标**: 支持 CLI/Hermes 对 task 的单条 CRUD、完成/恢复、归档、象限移动、提醒候选查询。

- [x] T008 [US4] 实现 `GET/POST /api/v1/tasks`。
  - scope: `apps/web/src/app/api/v1/tasks/route.ts`
  - verify: API tests 覆盖未授权、列表、创建、字段校验、审计

- [x] T009 [US4] 实现 `GET/PATCH /api/v1/tasks/{id}`。
  - scope: `apps/web/src/app/api/v1/tasks/[id]/route.ts`
  - verify: API tests 覆盖详情、更新、404、字段校验

- [x] T010 [US4] 实现 task 完成/恢复接口。
  - scope: `apps/web/src/app/api/v1/tasks/[id]/complete/route.ts`, `apps/web/src/app/api/v1/tasks/[id]/restore/route.ts`
  - verify: API tests 覆盖完成状态、恢复状态、重复调用行为

- [x] T011 [US4] 实现 task 归档接口。
  - scope: `apps/web/src/app/api/v1/tasks/[id]/archive/route.ts`
  - verify: API tests 覆盖归档后默认列表不返回、详情可按 ID 查询或返回明确状态

- [x] T012 [US4] 实现 task 象限移动和 key result 关联更新输入。
  - scope: `apps/web/src/app/api/v1/tasks/[id]/quadrant/route.ts`, task create/update route
  - verify: API tests 覆盖 Q1-Q4、非法象限、KR link 替换

- [x] T013 [US3] 实现无状态 task reminder candidates 查询。
  - scope: `apps/web/src/app/api/v1/tasks/reminders/route.ts`, `task-service.ts`
  - verify: API tests 覆盖 today、overdue、due soon、已完成任务不返回、重复查询仍返回符合条件任务

- [x] T014 [US4] 回归现有 `today/inbox/quadrants` route，确保归档任务被排除且响应仍兼容。
  - scope: `apps/web/src/app/api/v1/tasks/today`, `inbox`, `quadrants`
  - verify: API tests + existing task tests

## Phase 4: OKR Automation API

**目标**: 支持 CLI/Hermes 对 OKR period/objective/key-result/check-in 的创建、查询、更新和归档。

- [x] T015 [US5] 实现 OKR period 列表、创建、详情、更新和归档接口。
  - scope: `apps/web/src/app/api/v1/okr/periods/**`
  - verify: API tests 覆盖 CRUD、归档、日期校验、非法 type/status

- [x] T016 [US5] 实现 period objectives 列表接口。
  - scope: `apps/web/src/app/api/v1/okr/periods/[id]/objectives/route.ts`
  - verify: API tests 覆盖 period 不存在、正常列表、归档过滤策略

- [x] T017 [US5] 实现 objective 创建、详情、更新和归档接口。
  - scope: `apps/web/src/app/api/v1/okr/objectives/**`
  - verify: API tests 覆盖创建、更新、归档、非法 status、periodId 校验

- [x] T018 [US5] 实现 key result 创建、详情、更新和归档接口。
  - scope: `apps/web/src/app/api/v1/okr/key-results/**`
  - verify: API tests 覆盖 numeric/milestone/hybrid、进度字段、归档、非法 confidence/status

- [x] T019 [US5] 补齐 namespaced check-in 接口，并兼容现有 `/api/v1/key-results/{id}/check-ins`。
  - scope: `apps/web/src/app/api/v1/okr/key-results/[id]/check-ins/route.ts`, existing check-ins route
  - verify: API tests 覆盖 `GET` history、`POST` create、旧路径仍可用

- [x] T020 [US5] 回归 `GET /api/v1/okr/current`，确保新增归档语义不会污染当前 OKR summary。
  - scope: `apps/web/src/app/api/v1/okr/current/route.ts`, `okr-service.ts`
  - verify: `okr-service.test.ts` + API route tests

## Phase 5: Review and Context API

**目标**: 支持复盘详情、更新、定稿、归档，以及 Hermes daily/weekly/monthly/period 上下文读取。

- [x] T021 [US6] 补齐 `GET /api/v1/reviews/{id}`，并保持现有 `PATCH` 行为兼容。
  - scope: `apps/web/src/app/api/v1/reviews/[id]/route.ts`
  - verify: API tests 覆盖详情、404、未授权

- [x] T022 [US6] 实现 review finalize 接口。
  - scope: `apps/web/src/app/api/v1/reviews/[id]/finalize/route.ts`, `review-service.ts`
  - verify: API tests 覆盖 draft -> final、final 重复定稿行为

- [x] T023 [US6] 实现 review archive 接口，并让默认 review 列表排除 archived。
  - scope: `apps/web/src/app/api/v1/reviews/[id]/archive/route.ts`, `reviews/route.ts`
  - verify: API tests 覆盖归档后默认列表不返回

- [x] T024 [US1] 实现 `GET /api/v1/reviews/context`，默认返回当天 daily context。
  - scope: `apps/web/src/app/api/v1/reviews/context/route.ts`, `review-service.ts` 或新增 context service
  - verify: API tests 覆盖默认当天、空数据、未授权

- [x] T025 [US1] 为 review context 增加 `type=daily|weekly|monthly|period` 与 `start/end` 查询支持。
  - scope: review context route/service
  - verify: API tests 覆盖 weekly/monthly/period、自定义范围、非法日期、end < start

- [x] T026 [US6] 回归现有 `POST /api/v1/reviews` 与 `/reviews/weekly/draft`，确保新增 context/归档不破坏草稿保存和周复盘草稿。
  - scope: existing review routes and service tests
  - verify: `review-service.test.ts`, `okr-review-routes.test.ts`

## Phase 6: OpenAPI Contract

**目标**: 让 Hermes/CLI 能从契约发现新增 API，不只依赖代码路径。

- [x] T027 [Contract] 为 task endpoints 增加 OpenAPI paths、request schemas、response schemas、error responses。
  - scope: `packages/api-contract/src/v1/openapi.ts`
  - verify: `packages/api-contract/src/__tests__/openapi.test.ts`

- [x] T028 [Contract] 为 OKR endpoints 增加 OpenAPI paths、request schemas、response schemas、error responses。
  - scope: `packages/api-contract/src/v1/openapi.ts`
  - verify: OpenAPI tests 覆盖 operationId 和 schemas

- [x] T029 [Contract] 为 review/context endpoints 增加 OpenAPI paths、query parameters、response schemas、error responses。
  - scope: `packages/api-contract/src/v1/openapi.ts`
  - verify: OpenAPI tests 覆盖 daily/weekly/monthly/period 参数

- [x] T030 [Contract] 更新 contract 测试，确保新增核心 API 都存在且 `examples` 不作为核心业务 API 断言对象。
  - scope: `packages/api-contract/src/__tests__/openapi.test.ts`
  - verify: `pnpm test --filter @stride-os/api-contract` 或项目可用等价命令

## Phase 7: End-to-End Verification and Cleanup

**目标**: 完成集成验证，确保部署到 NAS 后可被 curl/Hermes/CLI 使用。

- [x] T031 [Verify] 跑完整测试与类型检查。
  - scope: repo
  - verify: `pnpm test`, `pnpm typecheck`, `pnpm lint`

- [x] T032 [Verify] 跑构建或 CI 检查。
  - scope: repo
  - verify: `pnpm build` 或 `pnpm check:ci`

- [x] T033 [Verify] 准备线上 smoke test 命令清单，覆盖 auth、task create/list/archive、OKR create/check-in、review context。
  - scope: `specs/expand-automation-api/` 可新增验收记录或在 PR 描述中记录
  - verify: curl 命令能用 `Authorization: Bearer $STRIDE_TOKEN` 调通 NAS 域名

- [x] T034 [Cleanup] 检查 `.next/types`、生成文件、数据库本地文件没有被误提交。
  - scope: git diff
  - verify: `git status --short`

## 依赖与顺序

```text
Phase 1 -> Phase 2 -> Phase 3/4/5 -> Phase 6 -> Phase 7
```

- Task/review archive schema必须先于对应 archive API。
- OpenAPI contract 可以与 route 实现并行推进，但最终必须和实际 route 对齐。
- Review context 依赖 task、OKR、review service 查询能力，适合在 core route 基本稳定后实现。

## 覆盖检查

- [x] US1 Hermes 复盘上下文: T024, T025, T029, T033
- [x] US2 Hermes 创建 OKR/task: T008, T015, T017, T018, T027, T028
- [x] US3 Hermes task 提醒: T013, T027, T033
- [x] US4 CLI task CRUD: T008-T014, T027
- [x] US5 CLI OKR CRUD: T015-T020, T028
- [x] US6 CLI review 管理: T021-T026, T029
- [x] 归档语义: T004-T007, T011, T015, T017, T018, T023
- [x] 契约与验证: T027-T034

## Notes

- 若 Phase 2 实施时发现 task/review archive 最小变更路径与 plan 不一致，先更新 `data-model.md` 再继续实现。
- 不新增 token scope、批量接口、idempotency key。
- 不实现 CLI 程序本体，也不实现 Hermes 的通知调度逻辑。
