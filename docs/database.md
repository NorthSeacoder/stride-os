# Database Modes

## Default local mode: SQLite

`Stride OS` defaults to SQLite for local development.

Why:

- zero external database setup
- persistent local data between restarts
- shortest first-run path

Default variables in `.env.example`:

```text
DATABASE_DRIVER=sqlite
DATABASE_URL=file:./packages/db/data/dev.sqlite
```

Default local workflow:

```bash
cp .env.example .env
pnpm install
pnpm db:setup
pnpm dev
```

What `pnpm db:setup` does:

- ensures the SQLite data directory exists
- applies SQLite migrations
- seeds the admin user if missing

## Deployment mode: PostgreSQL

Use PostgreSQL for NAS/server deployment.

Start from `.env.postgres.example`:

```text
DATABASE_DRIVER=postgres
DATABASE_URL=postgresql://user:password@host:5432/db
DATABASE_SCHEMA=stride_os
```

Switch workflow:

```bash
cp .env.postgres.example .env
# edit DATABASE_URL / DATABASE_SCHEMA / SESSION_SECRET
pnpm db:migrate
pnpm db:seed
```

Notes:

- application code does not change between SQLite and PostgreSQL
- `DATABASE_SCHEMA` only matters in PostgreSQL mode
- PostgreSQL remains the recommended deployment database

## Command behavior

All DB commands route by `DATABASE_DRIVER`:

- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm db:setup`
- `pnpm db:studio`

`db:setup` is the first-run command for local SQLite use.

## File paths

Default SQLite database file:

```text
packages/db/data/dev.sqlite
```

This path is ignored by git and safe for local development data.

## Deployment Incident Notes

### Incident Summary

`2026-05-11` 这次 NAS 发布后，登录接口一度返回服务端错误。最终定位不是单点问题，而是共享 PostgreSQL + 独立 schema 部署时的三层叠加问题。

### Root Causes

1. 代码层连接参数错误

`packages/db/src/client.ts` 原先把 PG 连接选项写成：

```text
--search_path=<schema>
```

对 `pg` / `libpq` 来说，正确写法应为：

```text
-c search_path=<schema>
```

错误写法会导致应用没有真正切到目标 schema。

2. schema 存在，但表没有落进去

库里虽然已经有项目 schema，但初始 migration 并没有把业务表真正创建到该 schema 下，导致应用启动后查询不到预期对象。

3. 业务用户权限不完整

已有表最初由更高权限角色创建，项目数据库用户缺少对表和序列的访问权限，最终触发：

```text
permission denied for table users
```

4. 共享数据库里还有其他 schema 的同名表

另一个 schema 中存在 `users` 表，叠加默认 `search_path` 未切换到项目 schema，导致排查阶段容易误以为“表存在但权限错”，实际是“schema 命中错位 + 权限不完整”一起发生。

### Effective Fix

代码修复：

- 把 `packages/db/src/client.ts` 中的 PG options 改为 `-c search_path=${env.databaseSchema}`

数据库修复：

1. 在目标 schema 内执行项目 migration SQL
2. 补默认管理用户
3. 授权项目数据库用户访问 schema、表、序列
4. 设置角色默认 `search_path`

本次实际需要的授权动作包括：

```sql
GRANT USAGE ON SCHEMA <project_schema> TO <project_db_user>;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA <project_schema> TO <project_db_user>;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA <project_schema> TO <project_db_user>;
ALTER ROLE <project_db_user> SET search_path TO <project_schema>, public;
ALTER ROLE <project_db_user> IN DATABASE postgres SET search_path TO <project_schema>, public;
```

### Lessons

共享 PostgreSQL + 独立 schema 模式下，光有 `DATABASE_SCHEMA` 还不够，必须同时满足：

1. 应用连接层真的切到了目标 schema
2. migration 真正落到了目标 schema
3. 业务用户拥有 schema、表、序列权限
4. 角色默认 `search_path` 也与项目 schema 一致

### Template Impact

模板仓如果复用同一套 PostgreSQL 连接封装，也必须同步修复。

当前需要继承到模板仓的最少改动：

1. 相同的 `search_path` 连接参数修复
2. 文档中明确共享 PostgreSQL 的 schema / grant / default search path 检查项
3. 发布检查单中加入“登录与读写接口”的数据库烟测
