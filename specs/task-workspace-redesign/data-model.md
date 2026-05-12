# Data Model: 任务工作区与全局壳层重构

**Workspace**: `task-workspace-redesign` | **Date**: 2026-05-12

---

## Entities

### 任务清单 (表名: `task_lists`)

**描述**: 承载系统保留清单与用户自定义清单，是任务归属与第一栏清单区的真实数据来源。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID / Text | PK | 主键 |
| name | String | NOT NULL | 清单名称 |
| icon | String | NULL | 清单图标标识 |
| kind | String | NOT NULL | `system` 或 `user` |
| slug | String | NOT NULL, UNIQUE | 稳定标识；系统清单如 `inbox` |
| sort_order | Integer | NOT NULL, DEFAULT 0 | 排序 |
| archived_at | Timestamp / Integer | NULL | 归档时间 |
| created_at | Timestamp / Integer | NOT NULL | 创建时间 |
| updated_at | Timestamp / Integer | NOT NULL | 更新时间 |

**索引**:
- `idx_task_lists_kind` on (`kind`)
- `idx_task_lists_sort_order` on (`sort_order`)
- `uidx_task_lists_slug` on (`slug`)

**约束**:

- 系统必须存在一条 `kind = system` 且 `slug = inbox` 的记录
- 初版不要求删除清单；如支持归档，已归档清单不应出现在默认清单区

---

### 重复任务定义 (表名: `task_definitions`)

**描述**: 描述一个重复任务的模板内容和重复规则，不直接出现在第二栏任务列表中。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID / Text | PK | 主键 |
| title | String | NOT NULL | 任务标题模板 |
| description | Text | NULL | 任务描述模板 |
| list_id | UUID / Text | NOT NULL, FK | 默认归属清单 |
| frequency | String | NOT NULL | `daily / weekly / monthly / weekdays / weekends` |
| end_type | String | NOT NULL | `never / until_date / after_count` |
| end_date | Date / Text | NULL | 结束日期 |
| occurrence_count | Integer | NULL | 结束次数 |
| created_at | Timestamp / Integer | NOT NULL | 创建时间 |
| updated_at | Timestamp / Integer | NOT NULL | 更新时间 |

**索引**:
- `idx_task_definitions_list_id` on (`list_id`)
- `idx_task_definitions_frequency` on (`frequency`)

**约束**:

- `end_type = until_date` 时，`end_date` 必填
- `end_type = after_count` 时，`occurrence_count` 必填且 > 0
- `end_type = never` 时，`end_date` 和 `occurrence_count` 应为空

**状态转换**:

```text
有效定义
  ├─ 更新内容/规则 → 仍为有效定义
  └─ 结束条件满足 → 停止生成未来实例
```

---

### 任务实例 (表名: `tasks`)

**描述**: 第二栏真实展示、第三栏真实查看、用户直接勾选完成的可执行任务实体。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID / Text | PK | 主键 |
| title | String | NOT NULL | 任务标题 |
| description | Text | NULL | 任务描述 |
| list_id | UUID / Text | NOT NULL, FK | 当前归属清单 |
| due_date | Date / Text | NULL | 唯一日期语义 |
| completed_at | Timestamp / Integer | NULL | 完成时间 |
| definition_id | UUID / Text | NULL, FK | 若来自重复定义，则指向定义 |
| occurrence_date | Date / Text | NULL | 若来自重复定义，记录该实例对应的发生日期 |
| created_at | Timestamp / Integer | NOT NULL | 创建时间 |
| updated_at | Timestamp / Integer | NOT NULL | 更新时间 |

**索引**:
- `idx_tasks_list_id` on (`list_id`)
- `idx_tasks_due_date` on (`due_date`)
- `idx_tasks_completed_at` on (`completed_at`)
- `idx_tasks_definition_id` on (`definition_id`)
- `uidx_tasks_definition_occurrence` on (`definition_id`, `occurrence_date`) when `definition_id` is not null

**约束**:

- 普通任务：`definition_id = null`、`occurrence_date = null`
- 重复生成任务：`definition_id != null`、`occurrence_date` 必填
- 勾选完成只写 `completed_at`，不清空 `due_date`

**状态转换**:

```text
OPEN (completed_at = null)
  ↔ COMPLETE (completed_at != null)
```

说明：

- 首版支持完成/取消完成双向切换
- 不再沿用旧 `today/inbox/scheduled/done/canceled` 状态机

---

### 任务与 KR 关联 (表名: `task_kr_links`)

**描述**: 任务实例与 OKR Key Result 的关联表。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| task_id | UUID / Text | PK, FK | 任务实例 ID |
| key_result_id | UUID / Text | PK, FK | KR ID |
| created_at | Timestamp / Integer | NOT NULL | 关联创建时间 |

**索引**:
- `idx_task_kr_links_key_result_id` on (`key_result_id`)

**约束**:

- 首版保持关联挂在任务实例层
- 若一个重复定义需要默认 KR 关联，则创建实例时复制定义期望关联到实例层

---

### 重复定义与 KR 默认关联 (表名: `task_definition_kr_links`)

**描述**: 保存重复任务定义的默认 KR 关联，用于生成实例时复制。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| definition_id | UUID / Text | PK, FK | 重复定义 ID |
| key_result_id | UUID / Text | PK, FK | KR ID |
| created_at | Timestamp / Integer | NOT NULL | 关联创建时间 |

**索引**:
- `idx_task_definition_kr_links_key_result_id` on (`key_result_id`)

**约束**:

- 仅重复定义使用此表
- 生成实例时，定义层关联复制到实例层 `task_kr_links`

---

## Relationships

```text
task_lists 1:N tasks                  (通过 tasks.list_id)
task_lists 1:N task_definitions       (通过 task_definitions.list_id)

task_definitions 1:N tasks            (通过 tasks.definition_id)
task_definitions N:N key_results      (通过 task_definition_kr_links)
tasks N:N key_results                 (通过 task_kr_links)
```

关系说明：

- 清单是归属容器
- 重复定义是未来实例的源
- 任务实例是执行与完成历史的真实载体
- KR 关联最终以实例层为准，确保 review 与 dashboard 统计面向真实执行记录

---

## DDL Scripts

```sql
-- task_lists
CREATE TABLE task_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  kind TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- task_definitions
CREATE TABLE task_definitions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NULL,
  list_id TEXT NOT NULL,
  frequency TEXT NOT NULL,
  end_type TEXT NOT NULL,
  end_date DATE NULL,
  occurrence_count INTEGER NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (list_id) REFERENCES task_lists(id)
);

-- tasks
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NULL,
  list_id TEXT NOT NULL,
  due_date DATE NULL,
  completed_at DATETIME NULL,
  definition_id TEXT NULL,
  occurrence_date DATE NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (list_id) REFERENCES task_lists(id),
  FOREIGN KEY (definition_id) REFERENCES task_definitions(id)
);

CREATE UNIQUE INDEX uidx_tasks_definition_occurrence
ON tasks(definition_id, occurrence_date);
```

说明：

- 以上为结构示意，实际 Drizzle DDL 需分别落到 SQLite / Postgres 方言
- 唯一索引用于保证同一重复定义在同一发生日期最多生成一条实例

---

## Migration Notes

- 当前为初版开发，不要求旧任务结构到新结构的迁移设计
- schema 变更可按“新域结构”直接落地
- `Inbox` 系统清单应在 seed 或初始化逻辑中保证存在
