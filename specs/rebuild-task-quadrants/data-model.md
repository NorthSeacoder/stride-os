# Data Model: 四象限任务视图重构

**Workspace**: `rebuild-task-quadrants` | **Date**: 2026-05-12

---

## Entities

### `tasks`

**描述**: 全局任务主实体。四象限页只是它的派生视图，不再拥有额外持久化象限字段。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID / text | PK | 任务 ID |
| title | string | NOT NULL | 标题 |
| notes | text \| null | nullable | 备注 |
| description | text \| null | nullable | 描述 |
| status | `inbox \| done` | NOT NULL | 仅保留完成与未完成流程状态 |
| listId | UUID / text \| null | FK | 所属清单 |
| dueDate | date \| null | nullable | 截止日期，格式 `YYYY-MM-DD` |
| completedAt | timestamp \| null | 条件约束 | `status=done` 时必须存在 |
| definitionId | UUID / text \| null | FK | 可选重复定义来源 |
| occurrenceDate | date \| null | nullable | 重复实例日期 |
| priority | `P1 \| P2 \| P3 \| null` | nullable | 唯一重要度输入 |
| energy | `low \| medium \| high \| null` | nullable | 保留原有字段 |
| createdAt | timestamp | NOT NULL | 创建时间 |
| updatedAt | timestamp | NOT NULL | 更新时间 |

**本次变化**:

- 删除 `important`
- 删除 `urgent`
- 删除 `idx_tasks_importance_urgency`
- 四象限相关排序不再依赖旧布尔字段

**状态说明**:

```text
open task: status = inbox, completedAt = null
completed task: status = done, completedAt != null
```

---

### `task_lists`

**描述**: 任务真实归属清单，也是四象限内的分组维度。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID / text | PK | 清单 ID |
| name | string | NOT NULL | 清单名称 |
| icon | string \| null | nullable | 清单图标 |
| kind | `system \| user` | NOT NULL | 系统清单或用户清单 |
| slug | string | NOT NULL | 稳定标识 |
| sortOrder | integer | nullable/default | 排序 |
| archivedAt | timestamp \| null | nullable | 归档时间 |

**与四象限相关的要求**:

- 四象限内所有任务都按 `listId` 聚合
- 同象限跨清单拖拽只修改 `listId`

---

### `task_definitions`

**描述**: 重复任务定义。不是这次四象限核心，但四象限新建/编辑会继续复用任务模块的统一表单。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID / text | PK | 定义 ID |
| title | string | NOT NULL | 定义标题 |
| description | text \| null | nullable | 定义描述 |
| listId | UUID / text | FK | 默认清单 |
| frequency | enum string | NOT NULL | 频率 |
| endType | enum string | NOT NULL | 结束方式 |
| endDate | date \| null | nullable | 按日期结束 |
| occurrenceCount | integer \| null | nullable | 按次数结束 |

**与四象限相关的要求**:

- 若四象限页通过统一表单创建重复任务，至少 `priority` 和 `dueDate/targetDate` 默认值要能正确预填
- 四象限归属仍以任务实例字段计算，不以定义字段直接决定

---

## Derived Models

### `QuadrantProjection`

**描述**: 由 `Task.priority`、`Task.dueDate`、`today` 计算出的只读派生模型，不持久化。

| 字段 | 类型 | 说明 |
|------|------|------|
| quadrant | `Q1 \| Q2 \| Q3 \| Q4` | 最终象限 |
| importanceBand | `high \| low` | 由优先级映射 |
| urgencyBand | `high \| low` | 由日历日差映射 |
| dayDelta | integer \| null | `dueDate - today` 的日历日差 |

**计算规则**:

```text
if dueDate is null:
  P1 -> Q1
  P2 -> Q2
  P3 -> Q3
  null -> Q4

if dueDate exists:
  D = dueCalendarDay - todayCalendarDay
  urgency = high when D <= 7
  urgency = low when D > 7

  importance = high when priority in [P1, P2]
  importance = low when priority in [P3, null]

  high + high -> Q1
  high + low  -> Q2
  low  + high -> Q3
  low  + low  -> Q4
```

**语义验收点**:

- `today + P1 -> Q1`
- `today+30d + null -> Q4`

---

### `QuadrantDefaults`

**描述**: 四象限唯一默认反演表，用于新建任务预填和跨象限拖拽回写。

| Quadrant | priority | dueDate strategy | 说明 |
|----------|----------|------------------|------|
| Q1 | `P1` | `today` | 高重要 + 高紧急 |
| Q2 | `P2` | `today + 8d` | 高重要 + 低紧急 |
| Q3 | `P3` | `today` | 低重要 + 高紧急 |
| Q4 | `null` | `today + 8d` | 低重要 + 低紧急 |

**约束**:

- 该表必须唯一，不能同一象限存在多个默认反演策略
- 拖拽进象限一律采用此表，不保留“无截止日期”写回策略

---

### `QuadrantBoard`

**描述**: `/quadrants` 页面服务端返回给客户端的聚合模型。

| 字段 | 类型 | 说明 |
|------|------|------|
| quadrants | `QuadrantSection[]` | 四个象限固定顺序数组 |
| today | string | 计算基准日 |
| showCompletedDefault | boolean | 页面默认开关 |

### `QuadrantSection`

| 字段 | 类型 | 说明 |
|------|------|------|
| key | `Q1 \| Q2 \| Q3 \| Q4` | 象限键 |
| title | string | 中文标题 |
| groups | `QuadrantListGroup[]` | 未完成任务分组 |
| completedGroups | `QuadrantListGroup[]` | 已完成任务分组 |
| totalCount | integer | 总任务数 |
| openCount | integer | 未完成数 |
| completedCount | integer | 已完成数 |

### `QuadrantListGroup`

| 字段 | 类型 | 说明 |
|------|------|------|
| listId | string | 清单 ID |
| listName | string | 清单名称 |
| listIcon | string \| null | 清单图标 |
| items | `Task[]` | 该清单下任务 |

---

## Mutation Rules

### 跨象限拖拽

```text
input: taskId, targetQuadrant
effect:
  patch.priority = defaults[targetQuadrant].priority
  patch.dueDate = defaults[targetQuadrant].dueDate(today)
  keep.listId as-is
  keep.completedAt/status as-is
```

### 同象限跨清单拖拽

```text
input: taskId, targetListId
effect:
  patch.listId = targetListId
  keep.priority as-is
  keep.dueDate as-is
```

### checkbox 完成切换

```text
input: taskId, completed boolean
effect:
  completed=true  -> status=done, completedAt=now
  completed=false -> status=inbox, completedAt=null
```

### 四象限新建默认值

```text
input: targetQuadrant
effect:
  formDefaults.priority = defaults[targetQuadrant].priority
  formDefaults.dueDate = defaults[targetQuadrant].dueDate(today)
```

---

## Relationships

```text
task_lists 1:N tasks
task_definitions 1:N tasks
tasks -> QuadrantProjection (derived from priority + dueDate + today)
QuadrantProjection -> grouped by task_lists inside QuadrantBoard
```

---

## Migration Notes

- 本次允许直接清空旧任务数据，不做历史兼容。
- 删除字段时，SQLite / Postgres schema 必须同步更新。
- 任何依赖 `important/urgent` 的测试、fixture、排序或 API 返回都必须一起调整。
- 若本地开发数据库沿用旧结构，需重新执行 `pnpm db:setup` 或等价重建流程。
