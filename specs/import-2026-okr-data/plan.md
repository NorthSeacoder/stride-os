# Implementation Plan: Import 2026 OKR Data

**Workspace**: `import-2026-okr-data` | **Date**: 2026-05-15 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/import-2026-okr-data/spec.md`

---

## Summary

本计划把 2026 全年 OKR 导入拆成三个安全阶段：先统一 OKR 枚举和契约，再提供生产业务数据清理的预览/执行路径，最后用可幂等脚本把 JSON 中的清单、年度周期、Objective 和 KR 直接写入数据库。

本阶段只形成实现计划和任务拆解，不执行生产清理或导入。

---

## Stack Detected

- Next.js App Router app in `apps/web`
- TypeScript monorepo managed by pnpm/Turbo
- Drizzle ORM schemas in `packages/db/src/schema`
- SQLite and Postgres dual-driver support
- Vitest tests
- OpenAPI contract in `packages/api-contract/src/v1/openapi.ts`

---

## Architecture Overview

```text
okr-2026.json
  -> import script validates and normalizes input
  -> transaction writes task_lists, periods, objectives, key_results
  -> manifest records refId/slug -> database ID mapping

cleanup script
  -> dry-run counts business records
  -> backup gate / explicit confirmation
  -> transaction deletes business data in dependency order

enum alignment
  -> DB schema + migrations
  -> OKR service constants
  -> API request parsing
  -> OpenAPI contract + contract tests
```

The import path should live in the DB/package tooling layer instead of the UI layer because the user accepts direct database writes and the operation is an initialization/maintenance workflow, not a normal interactive product flow.

---

## Key Design Decisions

### Decision 1: Use `year` for the 2026 OKR period

- **背景**: 用户确认这不是 2026 H1，而是整个 2026 年目标。
- **选项**:
  - A: 使用 `year`，周期为 `2026-01-01` 到 `2026-12-31` — 符合全年语义，当前 service 已支持。
  - B: 新增 `half` 并继续沿用 H1/H2 — 不符合当前需求，会给全年度目标增加不必要分段。
- **结论**: 使用 `year`。`half` 可作为未来枚举扩展，但不作为本次导入前置。
- **影响**: 旧 `okr-2026-h1.json` 需要调整 `period` 字段和文件语义。
- **来源**: Existing code: `apps/web/src/lib/services/okr-service.ts`, `packages/db/src/schema/sqlite.ts`, `packages/db/src/schema/postgres.ts`

### Decision 2: Keep auth/system data while deleting business data

- **背景**: 用户想清理生产环境测试数据，但不要求重置账号或 token。
- **选项**:
  - A: 只清业务表 — 风险低，保留登录、API token 和审计上下文。
  - B: 全库重置 — 清理彻底，但会破坏账号、token、session 和部署配置。
- **结论**: 默认只清业务表，保留 `users`, `sessions`, `api_tokens`, `audit_logs` 和系统 `inbox` 清单。
- **影响**: 清理脚本需要明确删除顺序和保留规则，不能简单 truncate 全库。
- **来源**: Existing code: `packages/db/src/seed.ts`, `packages/db/src/schema/*`

### Decision 3: Direct DB import with dry-run and manifest

- **背景**: 用户接受直接写库，当前 task list 没有完整公开 API，直接 API 导入会先卡在清单接口和扩展字段上。
- **选项**:
  - A: 直接写库脚本 — 快速、可事务化、适合一次性初始化。
  - B: 先补完整 import API — 更正式，但实现面更大，不符合当前“先导入真实数据”的节奏。
- **结论**: 使用 DB 脚本导入，同时输出 manifest 作为后续 API/任务导入的桥。
- **影响**: 脚本必须和双数据库驱动兼容，或在执行前明确 driver 限制。
- **来源**: Existing code: `packages/db/src/client.ts`, `packages/db/src/env.ts`, `packages/db/src/seed.ts`

---

## Module Design

### Module: Enum Alignment

**职责**: 让 OKR period 类型和状态在代码、数据库和 OpenAPI 中保持一致。

**改动概述**:

- 对齐 `PERIOD_TYPES` 和 `PERIOD_STATUSES`。
- 检查 SQLite/Postgres schema check constraints。
- 更新 OpenAPI schemas 中 `OkrPeriod` 和 `OkrPeriodWriteRequest` 的枚举。
- 更新契约测试，避免 contract 再次漂移。

**关键行为**:

```text
period.type enum should include the same values in:
- service constants
- sqlite schema check
- postgres schema check
- OpenAPI read/write schema
```

### Module: Production Business Data Cleanup

**职责**: 在导入真实 2026 OKR 前清理业务数据，并保护账号/认证/系统基础数据。

**改动概述**:

- 新增维护脚本，支持 `--dry-run` 和显式执行模式。
- 输出目标数据库 driver、URL/schema、每张业务表记录数。
- 按依赖顺序清理业务数据。
- 保留系统 `task_lists.slug = "inbox"`，删除非系统业务清单。

**默认清理表**:

```text
review_kr_snapshots
reviews
kr_check_ins
task_kr_links
task_definition_kr_links
tasks
task_definitions
key_results
objectives
periods
example_items
task_lists where kind != 'system'
```

**默认保留表**:

```text
users
sessions
api_tokens
audit_logs
task_lists where kind = 'system' and slug = 'inbox'
```

### Module: 2026 OKR Import

**职责**: 从 JSON 读取 2026 全年 OKR 草稿，规范化后直接写入数据库。

**改动概述**:

- 准备年度 OKR JSON 文件，使用 `period.type = "year"`。
- 校验 task list slug、Objective refId、KR refId 唯一。
- 写入 task lists、period、objectives、key_results。
- 输出 manifest，记录输入 refId/slug 到数据库 ID 的映射。
- 提供 dry-run 或 validation-only 模式。

**不直接落库的字段处理**:

```text
refId      -> manifest mapping only
eventTags  -> manifest/import metadata only, not DB field in this task
KR description -> keep in source JSON; do not write unless schema is extended later
```

---

## Project Structure

```text
specs/import-2026-okr-data/
├── [新增] spec.md
├── [新增] plan.md
└── [新增] tasks.md

packages/db/
├── [可能修改] src/schema/sqlite.ts
├── [可能修改] src/schema/postgres.ts
├── [可能修改] drizzle/sqlite/*.sql
├── [可能修改] drizzle/postgres/*.sql
├── [新增] scripts/cleanup-business-data.ts
├── [新增] scripts/import-2026-okr.ts
└── [新增] src/__tests__/okr-import.test.ts

packages/api-contract/
├── [修改] src/v1/openapi.ts
└── [修改] src/__tests__/openapi.test.ts

apps/web/
└── [可能修改] src/lib/services/okr-service.ts

repo data location:
└── [新增] docs/data/okr-2026.json
```

---

## Risks and Tradeoffs

- 生产数据清理有误删风险，必须 dry-run、显示目标库、备份后执行。
- 直接写库绕过 API activity logging，适合初始化，但不适合长期作为普通用户操作入口。
- 当前 DB 没有 KR `description` / `eventTags` 字段，保留在源 JSON 和 manifest 中比临时塞进其他字段更稳。
- OpenAPI 当前和 service/db 有枚举漂移，实现时必须先修契约，否则后续 Hermes 依赖会继续不准。
- 如果生产使用 Postgres，本地 SQLite 验证不能替代最终生产 dry-run。

---

## Verification Strategy

- 静态验证：`pnpm typecheck` 确认枚举和脚本类型正确。
- 单元验证：补 DB import/cleanup 的测试，覆盖 dry-run、幂等、保留系统数据、删除顺序。
- 契约验证：更新并运行 OpenAPI 测试，确保 period 枚举和实际 service/db 一致。
- 本地演练：在 SQLite dev DB 上执行 cleanup dry-run、cleanup、import dry-run、import。
- 生产前检查：执行生产 dry-run，确认目标数据库和记录数；完成备份；再执行实际清理与导入。
- 导入后校验：查询 2026 period、task lists、objectives、key_results 数量，并抽查 OKR 页面/API。

---

## Design Artifacts

| 产物 | 是否需要 | 说明 |
|------|---------|------|
| spec.md | 已生成 | 定义范围、场景和验收 |
| plan.md | 已生成 | 定义方案、模块和风险 |
| data-model.md | 暂不生成 | 本次默认不新增实体字段；如实现阶段决定扩展 KR metadata，再补 |
| tasks.md | 本阶段生成 | 拆解到可执行任务 |
| acceptance.md | 后续阶段生成 | 记录清理/导入验收结果 |

---

## Notes

- 本计划不执行任何生产清理或导入。
- 2026 目标内容本身需要在后续实现阶段从旧 JSON/Markdown 进一步整理成年度版本。
- 如果实现阶段决定新增 `eventTags` 或 KR `description` 字段，应回到 plan 补充 data-model，再继续 tasks。

---

## Sources

| 决策 | 来源 URL | 备注 |
|------|---------|------|
| Use `year` period | Existing code | `okr-service.ts` and DB schema already support `year` |
| Direct DB import | Existing code | task list has DB model but no dedicated public import API |
| Cleanup preservation rules | Existing code | `seed.ts` creates admin and system inbox |
