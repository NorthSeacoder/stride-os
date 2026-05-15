# Data Model: KR Task Progress Summary And Check-in Reframe

**Workspace**: `derive-kr-progress-from-tasks`  
**Date**: 2026-05-14  
**Spec**: [spec.md](spec.md)  
**Plan**: [plan.md](plan.md)

---

## Goal

为 KR 提供稳定的“自动任务完成摘要”读取模型，并将 check-in 从“默认进度来源”调整为“主观判断与信心来源”。

---

## Entities

### 1. Task-KR Commitment Link

在现有 task 与 key result 的 link 基础上补充承诺语义。

建议新增字段：

```text
taskKrLink
- taskId
- keyResultId
- countsTowardCommitment: boolean
- committedAt?: timestamp
```

语义：

- `countsTowardCommitment = false`
  仅表示任务与 KR 有关联，不参与本期自动摘要。
- `countsTowardCommitment = true`
  表示该任务实例已纳入本期 KR 承诺，参与自动摘要统计。

默认规则：

- 新增关联默认 `false`
- 只有显式纳入承诺后才改为 `true`

---

### 2. KR Task Progress Snapshot

新增服务层读取实体，不一定需要落库存储。

```text
KrTaskProgressSnapshot
- keyResultId: string
- committedTaskCount: number
- completedCommittedTaskCount: number
- openCommittedTaskCount: number
- hasCommittedTasks: boolean
- lastTaskProgressAt: datetime | null
```

语义：

- `committedTaskCount`: 当前周期已承诺任务实例总数
- `completedCommittedTaskCount`: 已完成承诺任务实例数
- `openCommittedTaskCount`: 未完成承诺任务实例数
- `hasCommittedTasks`: 是否存在承诺任务
- `lastTaskProgressAt`: 最近一次影响该摘要的任务进展时间（如实现可得）

注意：

- 第一版不要求输出百分比
- 第一版不要求反推出 `numeric` KR 的真实业务值

---

### 3. KR Subjective Check-in View

保留现有 `kr_check_ins` 作为人工判断记录源，但读取语义调整：

```text
KrSubjectiveStatus
- latestConfidence
- latestSummary
- latestBlockers
- latestNextActions
- latestCheckInAt
```

语义：

- `confidence` 永远来自最近一次 check-in
- `summary/blockers/nextActions` 继续由最近一次 check-in 提供
- `progressValue` 可保留历史兼容，但不再作为自动执行进展的唯一真相

---

### 4. Review KR Snapshot

当前 `reviewKrSnapshots.snapshot` 主要存：

```text
{
  title,
  status,
  currentValue,
  confidence,
  latestCheckInAt
}
```

建议调整为：

```text
{
  title,
  status,
  committedTaskCount,
  completedCommittedTaskCount,
  openCommittedTaskCount,
  confidence,
  latestCheckInAt
}
```

这样 review 记录保留的是“当时的自动任务摘要 + 主观判断”。

---

## State Semantics

### KR 自动执行进展

来源：

- 仅来自承诺任务实例的完成状态聚合

不再承担：

- 百分比自动推导
- `numeric` KR 真实业务数值反推
- `confidence` 推导

### KR 主观判断

来源：

- 最近一次 check-in

承担：

- 信心
- 文本总结
- 阻塞项
- 下一步动作

---

## Migration Considerations

### 历史 task-KR links

风险：

- 历史 link 没有承诺标记

保守迁移建议：

- 新字段默认值设为 `false`
- 如需批量回填，只能按明确规则做，不能隐式把所有历史 link 回填为 `true`

### 历史 currentValue

风险：

- 多处读取仍依赖 `key_results.current_value`

建议：

- 第一阶段不立即删除字段
- 将其降级为兼容字段，逐步移除作为“自动执行进展”的语义

### 历史 review snapshots

风险：

- 已生成 review 仍带旧结构

建议：

- 允许历史 snapshot 保持旧结构
- 新生成的 review 使用新结构
- 读取层兼容两种 snapshot 形态

---

## Open Implementation Notes

- 是否在 `task_definition` 级 link 同步引入承诺语义，需要看重复任务生成链路是否希望继承默认值。
- `lastTaskProgressAt` 是否真的要实现为持久字段，还是读取时从任务变更中推导，可在实现时再定。
- 风险 KR 规则不需要新增实体，但服务层需要一套新的组合判断函数。
