# Acceptance: Import 2026 OKR Data

## 1. Scope

本次交付覆盖：

- 2026 全年 OKR 源数据整理：`docs/data/okr-2026.json`
- 业务数据清理脚本：`packages/db/scripts/cleanup-business-data.ts`
- 2026 OKR 分层导入脚本：`packages/db/scripts/import-2026-okr.ts`
- 导入校验与测试

不包含：

- 生产库的自动执行
- 把 `eventTags`、KR `description`、`refId` 写入现有 DB schema

## 2. Production Runbook

### 2.1 预备条件

- 确认目标数据源文件为 `docs/data/okr-2026.json`
- 确认目标数据库连接信息正确
- 已完成生产库备份
- 确认要删除的是业务数据，不是用户、认证、token、audit log 和系统 inbox

### 2.2 推荐执行顺序

1. 先做备份
2. 先跑 cleanup dry-run
3. 再执行 cleanup confirm
4. 再跑 import validation-only
5. 再按 `清单 -> 周期 -> Objective -> KR -> manifest` 顺序执行导入
6. 最后做导入后核对

### 2.3 命令清单

以下命令以 SQLite 为例；生产如为 Postgres，只需替换 `DATABASE_DRIVER`、`DATABASE_URL` 和必要的 schema 环境变量。

```bash
DATABASE_DRIVER=sqlite DATABASE_URL='file:./packages/db/data/prod.sqlite' \
pnpm --filter @stride-os/db exec node --import tsx scripts/cleanup-business-data.ts --dry-run
```

```bash
DATABASE_DRIVER=sqlite DATABASE_URL='file:./packages/db/data/prod.sqlite' \
pnpm --filter @stride-os/db exec node --import tsx scripts/cleanup-business-data.ts --execute --confirm-cleanup
```

```bash
DATABASE_DRIVER=sqlite DATABASE_URL='file:./packages/db/data/prod.sqlite' \
pnpm --filter @stride-os/db exec node --import tsx scripts/import-2026-okr.ts --validate-only
```

```bash
DATABASE_DRIVER=sqlite DATABASE_URL='file:./packages/db/data/prod.sqlite' \
pnpm --filter @stride-os/db exec node --import tsx scripts/import-2026-okr.ts --task-lists-only
```

```bash
DATABASE_DRIVER=sqlite DATABASE_URL='file:./packages/db/data/prod.sqlite' \
pnpm --filter @stride-os/db exec node --import tsx scripts/import-2026-okr.ts --period-only
```

```bash
DATABASE_DRIVER=sqlite DATABASE_URL='file:./packages/db/data/prod.sqlite' \
pnpm --filter @stride-os/db exec node --import tsx scripts/import-2026-okr.ts --objectives-only
```

```bash
DATABASE_DRIVER=sqlite DATABASE_URL='file:./packages/db/data/prod.sqlite' \
pnpm --filter @stride-os/db exec node --import tsx scripts/import-2026-okr.ts --key-results-only
```

```bash
DATABASE_DRIVER=sqlite DATABASE_URL='file:./packages/db/data/prod.sqlite' \
pnpm --filter @stride-os/db exec node --import tsx scripts/import-2026-okr.ts --manifest --manifest=./packages/db/data/okr-2026.import-manifest.json
```

## 3. Expected Import Shape

- period: `2026`
- period type: `year`
- period status: `active`
- task lists: `4`
- objectives: `4`
- key results: `12`

清单 slug 固定为：

- `civil-service-exam`
- `health-repair`
- `content-business`
- `personal-operations`

## 4. Local Rehearsal Record

本地使用隔离 SQLite 库完成了完整演练：

- rehearsal DB: `packages/db/data/okr-rehearsal.sqlite`
- rehearsal manifest: `packages/db/data/okr-rehearsal-manifest.json`

### 4.1 Dry-run 结果

- cleanup dry-run 成功
- 保留数据统计：
  - `users = 1`
  - `sessions = 0`
  - `apiTokens = 0`
  - `auditLogs = 0`
  - `systemTaskLists = 1`
  - `inboxList = 1`

### 4.2 Import Validation 结果

- `ok = true`
- `taskListCount = 4`
- `objectiveCount = 4`
- `keyResultCount = 12`

### 4.3 Ordered Import 结果

- `--task-lists-only`: created `4`
- `--period-only`: created `2026`
- `--objectives-only`: created `4`
- `--key-results-only`: 导入链路通过
- `--manifest`: 生成成功

说明：

- 本地曾先跑过一次 E2E 导入，所以后续 rehearsal 中 `--key-results-only` 的结果表现为 `reused = 12`
- 这符合幂等导入预期，不代表导入失败

### 4.4 Relevant Verification

- `pnpm typecheck`
- `pnpm test packages/db/src/__tests__/okr-import-e2e.test.ts packages/db/src/__tests__/okr-import-script.test.ts packages/db/src/__tests__/cleanup-business-data.test.ts`

结果：

- typecheck 通过
- 3 个相关测试文件全部通过，5 个测试全部通过

## 5. Post-Import Checks

导入完成后至少确认：

1. `periods` 中存在 `name = '2026'`、`type = 'year'`、`status = 'active'`
2. `task_lists` 中新增 4 条用户清单，且系统 `inbox` 仍保留
3. `objectives` 总数为 4，且都挂在 2026 period 下
4. `key_results` 总数为 12，且都挂在对应 objective 下
5. manifest 文件已生成，包含 `periodId`、`taskList id`、`objectiveId`、`keyResultId`

应用侧补充点验：

1. 打开 `/okr` 页面，确认能看到 `2026`
2. 确认 `2026` 下目标数为 `4`
3. 确认 `2026` 下 KR 总数为 `12`
4. 如使用 API，再确认 `/api/v1/okr/periods` 或 `/api/v1/okr/current` 返回正常

## 6. Production Manual Confirmation Checklist

真正执行生产操作前，必须人工确认以下内容：

- 已确认目标库不是本地开发库
- 已记录目标库连接串或 schema
- 已完成可回滚备份，并记录备份位置
- 已保存 cleanup dry-run 输出
- 已确认 dry-run 输出中保留表计数正常
- 已确认源文件是 `docs/data/okr-2026.json`
- 已确认源文件摘要为 `4 task lists / 4 objectives / 12 key results`
- 已确认执行顺序为 `cleanup -> validate -> task lists -> period -> objectives -> key results -> manifest`
- 已确认本次不会顺手清理用户、认证、token、session、audit log、system inbox
- 已准备导入后页面/API/数据库抽检
