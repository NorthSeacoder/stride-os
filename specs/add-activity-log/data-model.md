# Data Model: Activity Log Panel

**Workspace**: `add-activity-log` | **Date**: 2026-05-13

---

## Entities

### Audit Log / Activity Record (table: `audit_logs`)

**Description**: Existing operation log table expanded to support domain activity display and filtering for OKR, task, and key Review changes.

| Field | Type | Constraint | Notes |
|-------|------|------------|-------|
| `id` | UUID/text | PK | Existing primary key |
| `actor_type` | string | NOT NULL | `user`, `api_token`, `agent`, `system`, or existing auth values |
| `actor_id` | UUID/text | NULL, indexed with actor type | User ID, token ID, agent ID, or null when unknown/system |
| `action` | string | NOT NULL, indexed | Domain action such as `task.update`, `okr.key_result.check_in`, `review.finalize` |
| `target_type` | string | NULL, indexed with target ID | `task`, `objective`, `key_result`, `period`, `review`, `task_kr_link`, `api_token`, etc. |
| `target_id` | string | NULL, indexed with target type | Target entity ID |
| `target_title` | string | NULL | Snapshot title/name for display and keyword search |
| `source` | string | NULL, indexed | `web`, `api`, `cli`, `hermes`, `agent`, `system`, `unknown` |
| `summary` | string | NULL | Human-readable event summary |
| `metadata` | JSON | NULL | Display-safe context, diff, changed fields, request ID, command label |
| `created_at` | timestamp | NOT NULL, indexed | Event timestamp |

**Indexes**:

- `idx_audit_logs_created_at` on (`created_at`)
- `idx_audit_logs_target` on (`target_type`, `target_id`, `created_at`)
- `idx_audit_logs_actor` on (`actor_type`, `actor_id`, `created_at`)
- `idx_audit_logs_action_created_at` on (`action`, `created_at`)
- `idx_audit_logs_source_created_at` on (`source`, `created_at`)

**Retention**:

- First release retains activity indefinitely.
- No automatic cleanup, archival, or TTL is required.

### Activity Metadata (JSON shape in `audit_logs.metadata`)

**Description**: Structured display-safe details for event expansion and agent traceability. This is not a separate table.

| Field | Type | Constraint | Notes |
|-------|------|------------|-------|
| `actorLabel` | string | optional | Friendly label such as `Hermes Agent` |
| `requestId` | string | optional | Request correlation ID when available |
| `command` | string | optional | CLI command label or short command summary; must not include secrets |
| `parent` | object | optional | Parent target context, such as objective for a key result |
| `changedFields` | string[] | optional | User-facing field names changed by the operation |
| `diff` | object | optional | Field-level before/after values |
| `notes` | string | optional | Display-safe extra context |

**Example**:

```json
{
  "actorLabel": "Hermes Agent",
  "requestId": "req_123",
  "command": "task complete",
  "parent": {
    "type": "key_result",
    "id": "kr_123",
    "title": "Ship weekly review workflow"
  },
  "changedFields": ["status", "completedAt"],
  "diff": {
    "status": { "from": "inbox", "to": "done" },
    "completedAt": { "from": null, "to": "2026-05-13T10:30:00.000Z" }
  }
}
```

## Relationships

```text
users 1:N audit_logs via audit_logs.actor_id when actor_type = user
api_tokens 1:N audit_logs via audit_logs.actor_id when actor_type = api_token
tasks 1:N audit_logs via target_type = task and target_id = tasks.id
objectives 1:N audit_logs via target_type = objective and target_id = objectives.id
key_results 1:N audit_logs via target_type = key_result and target_id = key_results.id
reviews 1:N audit_logs via target_type = review and target_id = reviews.id
```

Foreign keys are not required for `target_id` because `target_type` is polymorphic and records should remain readable even if a target is archived or deleted by future features.

## Action Taxonomy

```text
task.create
task.update
task.complete
task.restore
task.archive
task.move_list
task.move_quadrant
task.link_key_result
task.unlink_key_result

okr.period.create
okr.period.update
okr.period.archive
okr.objective.create
okr.objective.update
okr.objective.archive
okr.key_result.create
okr.key_result.update
okr.key_result.check_in

review.draft.create
review.draft.update
review.finalize
review.archive
```

Auth/token actions such as `auth.login`, `auth.logout`, `token.create`, and `token.revoke` remain valid existing audit actions.

## Source Taxonomy

```text
web      - dashboard/server action initiated by a signed-in user
api      - authenticated HTTP API call with no more specific trusted source
cli      - official CLI path
hermes   - Hermes agent path when explicitly identified by trusted request context
agent    - other trusted agent path
system   - internal system operation
unknown  - supported path but source was unavailable
```

## Migration Notes

- Add nullable `target_title`, `source`, and `summary` columns to `audit_logs`.
- Add the indexes listed above in both SQLite and PostgreSQL migrations.
- Existing rows do not need backfill; display should tolerate null `source`, `summary`, and `target_title`.
- Keep SQLite and PostgreSQL schema definitions aligned.
