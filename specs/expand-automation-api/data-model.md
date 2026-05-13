# Data Model: Expand Automation API

## Entities

### API Token (表名: `api_tokens`)

**用途**: Authenticate Hermes and CLI calls through `Authorization: Bearer <token>`.

**Current Fields**:

- `id`
- `userId`
- `name`
- `tokenHash`
- `scopes`
- `lastUsedAt`
- `expiresAt`
- `revokedAt`
- `createdAt`

**MVP Decision**:

- Do not enforce token scopes for this feature.
- Existing `scopes` field can remain unused or informational.
- Audit source can use user and token naming if available; no mandatory token schema change.

### Task (表名: `tasks`)

**用途**: CLI/Hermes-managed work item.

**Core API Fields**:

- `id`
- `title`
- `notes`
- `description`
- `listId`
- `dueDate`
- `priority`
- `energy`
- `status`
- `completedAt`
- key-result links
- `archivedAt`
- timestamps

**State Model**:

```text
active -> done
done -> active
active/done -> archived
```

**Archive Requirement**:

- Default task list/read endpoints exclude archived tasks.
- Detail endpoint may return archived tasks by ID.
- Archive is represented by nullable `archivedAt`; default task list/read endpoints filter `archivedAt is null`.

**Reminder Candidate Rule**:

- A reminder candidate is derived from `dueDate`, `completedAt/status`, and current date.
- Stride OS does not persist reminder delivery state in MVP.

### Task-KR Link (表名: `task_kr_links`)

**用途**: Attach tasks to key results for OKR tracking and review context.

**Core API Behavior**:

- Task create/update can accept key result IDs.
- Task detail can return linked key results.
- Link replacement should reuse existing service behavior where possible.

### OKR Period (表名: `periods`)

**用途**: Time container for objectives.

**Core API Fields**:

- `id`
- `type`
- `title`
- `startDate`
- `endDate`
- `status`
- timestamps

**State Model**:

```text
active -> archived
```

### Objective (表名: `objectives`)

**用途**: Goal under an OKR period.

**Core API Fields**:

- `id`
- `periodId`
- `title`
- `description`
- `status`
- `sortOrder`
- timestamps

**State Model**:

```text
active -> done
active/done -> archived
```

### Key Result (表名: `key_results`)

**用途**: Measurable result under an objective.

**Core API Fields**:

- `id`
- `objectiveId`
- `title`
- `type`
- `targetValue`
- `currentValue`
- `unit`
- `status`
- `confidence`
- `sortOrder`
- timestamps

**State Model**:

```text
active -> at_risk
active/at_risk -> done
active/at_risk/done -> archived
```

### KR Check-in (表名: `kr_check_ins`)

**用途**: Progress update for a key result.

**Core API Fields**:

- `id`
- `keyResultId`
- `value`
- `confidence`
- `note`
- `createdAt`

**MVP Decision**:

- No explicit idempotency key storage.
- Repeated create requests can create multiple check-ins.

### Review (表名: `reviews`)

**用途**: Daily/weekly/monthly/period reflection record and history.

**Current Fields**:

- `id`
- `type`
- `periodStart`
- `periodEnd`
- `status`
- `title`
- `body`
- `structuredSummary`
- timestamps

**Required API Behavior**:

- List and filter by `type`, `periodStart`, and `periodEnd`.
- Save/update drafts.
- Finalize drafts.
- Archive reviews so default history hides them.

**Archive Requirement**:

- Current `status` values cover `draft` and `final`.
- Archive is represented by nullable `archivedAt`; default review list/read endpoints filter `archivedAt is null`.

**Review Type Note**:

- Stored review types currently include `weekly`, `monthly`, and `period`.
- Daily review context is required for Hermes. Implementation can support daily as a context query type without necessarily adding `daily` as a stored review type unless storing daily reviews is chosen.

### Review KR Snapshot (表名: `review_kr_snapshots`)

**用途**: Preserve key result state at review save/finalization time.

**Core API Behavior**:

- Review responses may include associated snapshots where useful.
- Review context can use snapshots and current key results for historical context.

## Relationships

```text
api_tokens N:1 users
periods 1:N objectives
objectives 1:N key_results
key_results 1:N kr_check_ins
tasks N:M key_results  (via task_kr_links)
reviews 1:N review_kr_snapshots
review_kr_snapshots N:1 key_results
```

## DDL Scripts

Expected migration areas:

```text
packages/db/src/schema/sqlite.ts
packages/db/src/schema/postgres.ts
packages/db/migrations/*
```

Potential schema changes:

- Add nullable `archived_at` and an index for `tasks`.
- Add nullable `archived_at` and an index for `reviews`.

No required schema changes for:

- OKR period archive state.
- Objective archive state.
- Key result archive state.
- API token scopes.
- Reminder delivery state.
- Idempotency keys.

## Migration Notes

- Keep SQLite and Postgres schema files in sync.
- Existing task and review records should remain visible after migration.
- `archivedAt` defaults to null and default list endpoints filter by null.
- Avoid changing existing review `draft` and `final` semantics when adding archive behavior.
