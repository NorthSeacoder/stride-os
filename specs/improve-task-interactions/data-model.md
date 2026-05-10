# Data Model: 优化任务创建与四象限交互

**Workspace**: `improve-task-interactions` | **Date**: 2026-05-09

---

## Entities

### Task (表名: `tasks`)

**描述**: 任务主实体，驱动任务列表、今日视图、排期视图和四象限投影。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK | 任务 ID |
| title | String | NOT NULL | 标题，创建必填 |
| notes | String \| null | NULLABLE | 备注 |
| status | `inbox \| today \| scheduled \| done \| canceled` | NOT NULL | 任务流程状态 |
| todayType | `must \| focus \| null` | 条件约束 | 仅 `status=today` 时可非空 |
| scheduledDate | String \| null | 条件约束 | `status=scheduled` 时必填，格式 `YYYY-MM-DD` |
| dueDate | String \| null | NULLABLE | 截止日期，格式 `YYYY-MM-DD` |
| important | Boolean | NOT NULL | 四象限重要性轴 |
| urgent | Boolean | NOT NULL | 四象限紧急性轴 |
| priority | `P1 \| P2 \| P3 \| null` | NULLABLE | 优先级 |
| energy | `low \| medium \| high \| null` | NULLABLE | 精力消耗 |
| completedAt | Date \| null | 条件约束 | `status=done` 时自动补齐 |
| createdAt | Date | NOT NULL | 创建时间 |
| updatedAt | Date | NOT NULL | 更新时间 |

**状态转换**:

```text
inbox
  ├─> today (requires todayType)
  ├─> scheduled (requires scheduledDate)
  ├─> done
  └─> canceled

today
  ├─> inbox (clears todayType)
  ├─> scheduled
  ├─> done
  └─> canceled

scheduled
  ├─> today
  ├─> inbox
  ├─> done
  └─> canceled
```

**本次变化**:

- 数据表字段不变
- 创建/编辑入口改为 modal，不影响实体结构
- 日期字段会通过 Base UI wrapper + `react-day-picker` 统一输入，但提交格式保持 `YYYY-MM-DD`
- 四象限拖拽只更新 `important/urgent`，不改变 `status`

---

### Task-KR Link (表名: `taskKrLinks`)

**描述**: 任务与关键结果的多对多关联表。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| taskId | String | FK, NOT NULL | 关联任务 |
| keyResultId | String | FK, NOT NULL | 关联 KR |
| createdAt | Date | NOT NULL | 创建时间 |

**关系**:

- 一个 `Task` 可关联多个 `KeyResult`
- 一个 `KeyResult` 可被多个 `Task` 关联

**本次变化**:

- 关系模型不变
- `replaceTaskKeyResultLinks(taskId, keyResultIds)` 的事务边界调整
- 推荐模式：事务内只做删旧/写新，回读查询放到事务外或使用当前驱动兼容的安全形式

---

### Quadrant Projection (只读派生模型)

**描述**: 由 `Task.important` 与 `Task.urgent` 派生出的四象限视图模型，不单独入库。

| important | urgent | quadrant |
|-----------|--------|----------|
| true | true | `do` |
| true | false | `decide` |
| false | true | `delegate` |
| false | false | `delete` |

**本次变化**:

- 从“按钮切换象限”改为“拖动进入象限”
- 服务端仍只接收 `{ important, urgent }`
- 前端会新增临时拖拽状态以支持 optimistic move 和失败回退

---

### DashboardSummary (只读聚合模型)

**描述**: dashboard 页面的服务层聚合结果，不直接对应单表。

| 字段 | 类型 | 说明 |
|------|------|------|
| currentPeriodSummary | Object \| null | 当前周期摘要 |
| todayTaskCounts | Object | `mustCount` / `focusCount` |
| riskKeyResults | Array | 风险 KR 列表 |
| latestReview | Object \| null | 最近复盘 |
| chartStats | Object \| undefined | 本次可能新增的图表聚合字段 |

**本次变化**:

- 允许在不改 schema 的前提下追加图表所需的轻量统计
- 新统计字段应来自现有 tasks / reviews / keyResults 数据

---

### TaskModalState (前端瞬时模型，Base UI Dialog)

**描述**: 任务页客户端状态，控制 Base UI Dialog modal 的打开模式和当前编辑对象。

| 字段 | 类型 | 说明 |
|------|------|------|
| mode | `create \| edit` | 当前表单模式 |
| taskId | String \| null | 编辑模式下的目标任务 ID |
| open | Boolean | modal 是否打开 |

**状态转换**:

```text
CLOSED
  ├─ click "新建任务" -> OPEN(create)
  ├─ click "编辑" -> OPEN(edit)

OPEN(create/edit)
  ├─ submit success -> CLOSED
  ├─ cancel -> CLOSED
  └─ submit error -> OPEN(same mode)
```

---

## Relationships

```text
Task 1:N Task-KR Link N:1 KeyResult
Task -> Quadrant Projection (derived from important + urgent)
DashboardSummary -> aggregates Task + KeyResult + Review
TaskModalState -> Base UI Dialog -> references Task (edit mode only, client-side)
```

---

## Migration Notes

- 不需要数据库 migration
- 不需要新增表、字段或索引
- 主要变更集中在：
  - 服务层事务实现
  - dashboard 聚合字段
  - 基于 Base UI 的前端瞬时状态与交互 wrappers
