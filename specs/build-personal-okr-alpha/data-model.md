# Data Model: Personal OKR Alpha

**Workspace**: `stride-os` | **Date**: 2026-05-09

---

## Entities

### `periods`

**描述**: Personal OKR 周期，承载年度、季度或自定义周期。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID / text | PK | 主键 |
| name | string | NOT NULL | 周期名称 |
| type | string | NOT NULL | `year | quarter | custom` |
| startDate | date | NOT NULL | 周期开始 |
| endDate | date | NOT NULL | 周期结束 |
| status | string | NOT NULL | `active | archived` |
| createdAt | timestamp | NOT NULL | 创建时间 |
| updatedAt | timestamp | NOT NULL | 更新时间 |

**索引**:
- `idx_periods_status`
- `idx_periods_start_date`

---

### `objectives`

**描述**: 周期下的目标。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID / text | PK | 主键 |
| periodId | UUID / text | NOT NULL, FK | 所属周期 |
| title | string | NOT NULL | 目标标题 |
| description | string | nullable | 目标说明 |
| status | string | NOT NULL | `active | done | archived` |
| sortOrder | integer | NOT NULL | 排序 |
| createdAt | timestamp | NOT NULL | 创建时间 |
| updatedAt | timestamp | NOT NULL | 更新时间 |

**索引**:
- `idx_objectives_period_id`
- `idx_objectives_status`

---

### `key_results`

**描述**: Objective 下的关键结果。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID / text | PK | 主键 |
| objectiveId | UUID / text | NOT NULL, FK | 所属 Objective |
| title | string | NOT NULL | KR 标题 |
| type | string | NOT NULL | `numeric | milestone | hybrid` |
| targetValue | number | nullable | 目标值 |
| currentValue | number | nullable | 当前值 |
| unit | string | nullable | 单位 |
| status | string | NOT NULL | `active | at_risk | done | archived` |
| confidence | string | nullable | `low | medium | high` |
| createdAt | timestamp | NOT NULL | 创建时间 |
| updatedAt | timestamp | NOT NULL | 更新时间 |

**索引**:
- `idx_key_results_objective_id`
- `idx_key_results_status`

**状态说明**:
- `at_risk` 用于 Dashboard 风险展示。

---

### `kr_check_ins`

**描述**: KR 的时间序列进度记录。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID / text | PK | 主键 |
| keyResultId | UUID / text | NOT NULL, FK | 所属 KR |
| progressValue | number | nullable | 本次进度 |
| confidence | string | NOT NULL | `low | medium | high` |
| summary | text | nullable | 本次说明 |
| blockers | text | nullable | 阻塞项 |
| nextActions | text | nullable | 下一步动作 |
| createdAt | timestamp | NOT NULL | 创建时间 |

**索引**:
- `idx_kr_check_ins_key_result_id`
- `idx_kr_check_ins_created_at`

---

### `tasks`

**描述**: 个人待办。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID / text | PK | 主键 |
| title | string | NOT NULL | 任务标题 |
| notes | text | nullable | 备注 |
| status | string | NOT NULL | `inbox | today | scheduled | done | canceled` |
| todayType | string | nullable | `must | focus | null` |
| scheduledDate | date | nullable | 计划日期 |
| dueDate | date | nullable | 截止日期 |
| completedAt | timestamp | nullable | 完成时间 |
| important | boolean | NOT NULL | 是否重要 |
| urgent | boolean | NOT NULL | 是否紧急 |
| priority | string | nullable | `P1 | P2 | P3` |
| energy | string | nullable | `low | medium | high` |
| createdAt | timestamp | NOT NULL | 创建时间 |
| updatedAt | timestamp | NOT NULL | 更新时间 |

**索引**:
- `idx_tasks_status`
- `idx_tasks_today_type`
- `idx_tasks_scheduled_date`
- `idx_tasks_due_date`
- `idx_tasks_priority`
- `idx_tasks_importance_urgency`

**状态说明**:
- `inbox` 是默认入口。
- `today` 任务必须有 `todayType`。
- `done` 任务保存 `completedAt`。

---

### `task_kr_links`

**描述**: Task 与 KR 的多对多连接表。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| taskId | UUID / text | NOT NULL, FK | 任务 |
| keyResultId | UUID / text | NOT NULL, FK | KR |
| createdAt | timestamp | NOT NULL | 创建时间 |

**索引**:
- `pk(taskId, keyResultId)`
- `idx_task_kr_links_key_result_id`

---

### `reviews`

**描述**: 周复盘、月复盘、周期复盘的正式记录。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID / text | PK | 主键 |
| type | string | NOT NULL | `weekly | monthly | period` |
| periodStart | date | NOT NULL | 时间范围开始 |
| periodEnd | date | NOT NULL | 时间范围结束 |
| status | string | NOT NULL | `draft | final` |
| title | string | NOT NULL | 标题 |
| body | text | NOT NULL | 正文 |
| structuredSummary | json | nullable | 结构化摘要 |
| createdAt | timestamp | NOT NULL | 创建时间 |
| updatedAt | timestamp | NOT NULL | 更新时间 |

**索引**:
- `idx_reviews_type`
- `idx_reviews_period_start_end`
- `idx_reviews_status`

**状态说明**:
- `draft` 可编辑。
- `final` 表示正式归档。

---

### `review_kr_snapshots`

**描述**: 保存复盘当时的 KR 快照，避免后续 KR 变化覆盖历史判断。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID / text | PK | 主键 |
| reviewId | UUID / text | NOT NULL, FK | 所属复盘 |
| keyResultId | UUID / text | NOT NULL, FK | KR |
| snapshot | json | NOT NULL | 当时的 KR 数据 |
| createdAt | timestamp | NOT NULL | 创建时间 |

**索引**:
- `idx_review_kr_snapshots_review_id`
- `idx_review_kr_snapshots_key_result_id`

---

## Relationships

```text
periods 1:N objectives
objectives 1:N key_results
key_results 1:N kr_check_ins
tasks N:M key_results via task_kr_links
reviews 1:N review_kr_snapshots
key_results 1:N review_kr_snapshots
```

---

## State Flow Notes

```text
Task:
inbox -> today -> done
inbox -> scheduled -> today -> done
any active state -> canceled

Today grouping:
today + todayType = must | focus

Review:
draft -> final

KR:
active -> at_risk -> done
active -> archived
```

---

## Migration Notes

- Add tables to both SQLite and Postgres schema files in lockstep.
- Keep current auth/token/audit/example tables untouched.
- Seed data should remain minimal; no fake OKR demo data is required for Alpha unless needed for smoke testing.
