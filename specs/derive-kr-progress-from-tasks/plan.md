# Implementation Plan: KR Task Progress Summary And Check-in Reframe

**Workspace**: `derive-kr-progress-from-tasks` | **Date**: 2026-05-14 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/derive-kr-progress-from-tasks/spec.md`

---

## Summary

本次改动将 KR 的自动进展从“依赖 `currentValue`/最近 check-in 的单值进度”重构为“任务完成摘要 + check-in 主观判断”双轨模型。推荐方案是在任务-KR 关联层引入“是否计入本期承诺”的轻量标记，由服务层统一产出 KR 任务完成摘要视图，并将 dashboard / review / 详情页改为消费该视图，同时保留 check-in 的时间线、信心和文本判断价值。

---

## Architecture Overview

当前系统中，KR 自动信息主要来自 `key_results.current_value/confidence` 与 `kr_check_ins`；任务模块只负责维护 `taskKrLinks` 关系，不提供任何 KR 级聚合。此次改动需要新增一层面向读取的聚合视图：

1. 任务与 KR 的关联关系继续存在，但需要额外区分“普通关联”与“纳入本期承诺的实例关联”。
2. `okr-service` 成为 KR 自动任务完成摘要的唯一汇总层，负责输出：
   - 已完成承诺任务数
   - 已承诺任务总数
   - 未完成任务数
   - 最近任务进展时间（如可得）
   - 空状态说明
3. `getKeyResultDetail`、`listPeriods`、`getCurrentPeriodSummary`、`listRiskKeyResults`、review 上下文和相关 API 路由统一改为读取新的任务摘要，而不是把 `currentValue` 当作默认执行进展。
4. `check-in` 保留为单独的人工判断层：负责 `confidence`、`summary`、`blockers`、`nextActions`，以及可选的主观进展文本/值，但不再承担自动执行摘要的唯一来源。
5. dashboard / review 的风险口径改为组合信号：缺少 check-in 仍是风险信号，但要和“任务是否持续推进”一起判断，避免纯误报。

---

## Key Design Decisions

### Decision 1: 自动视图从百分比进度改为任务完成摘要

- **背景**: 用户明确反对复杂的步长/偏移/覆盖状态机，并指出任务会随着推进新增，重复任务也需要合理处理。
- **选项**:
  - A: 继续计算 KR 百分比完成度，并处理新增任务、重复任务、手工修正的叠加规则 — 表达更“完整”，但复杂度明显过高。
  - B: 自动只提供任务完成摘要，不再强算百分比，由 check-in 承载主观判断 — 语义更稳定，复杂度显著更低。
- **结论**: 选择 B。
- **影响**: 页面与 API 需要从“读一个当前值”改为“读一组自动摘要 + 一组主观判断”，但可以避免大量后续状态机复杂度。
- **来源**: UNVERIFIED — 业务规则决策，基于需求澄清而非框架文档。

### Decision 2: 在任务-KR 关系层增加“承诺任务”语义，而不是从现有关联关系直接推断

- **背景**: 用户明确要求“新增关联任务默认不计入分母”，否则随着任务补充会让自动进展失真。
- **选项**:
  - A: 所有关联任务默认都计入承诺 — 无额外字段，但与需求冲突。
  - B: 在关联层显式记录“是否计入本期承诺” — 增加少量数据复杂度，但语义清晰。
- **结论**: 选择 B。
- **影响**: 需要数据模型变更、任务编辑入口补能力、聚合查询按该标记过滤。
- **来源**: UNVERIFIED — 业务规则决策，基于需求澄清而非框架文档。

### Decision 3: 保留现有 React 19 / Next 16 表单与 Server Action 模式

- **背景**: 相关页面当前已经大量使用 `useActionState` + Server Actions，且技术栈为 React 19 / Next 16。
- **选项**:
  - A: 保持现有 form + Server Action 模式，在现有页面上增量修改 — 与代码库一致，改动收敛。
  - B: 为此功能引入额外客户端状态管理层 — 灵活但不必要，会扩大改动面。
- **结论**: 选择 A。
- **影响**: 任务/KR UI 的调整可在现有 action 流程中完成，不需要新增全局状态方案。
- **来源**: https://react.dev/reference/react/useActionState

### Decision 4: 风险 KR 口径从“纯 check-in 缺失”改为“check-in + 任务摘要”的组合信号

- **背景**: 用户明确表示“需要调整”风险 KR 口径；spec 也已确认缺少 check-in 仍需保留，但不能单独判风险。
- **选项**:
  - A: 保持现状，只要缺少 check-in 就判风险 — 实现简单，但与新模型冲突。
  - B: 组合判断：缺少/过旧 check-in、低信心、任务无推进、显式 `at_risk` 状态共同构成风险 — 更符合新的自动摘要模型。
- **结论**: 选择 B。
- **影响**: `listRiskKeyResults` 与 dashboard/review 文案、快照生成逻辑都要调整。
- **来源**: UNVERIFIED — 业务规则决策，基于需求澄清而非框架文档。

---

## Module Design

### Module: 数据模型（Task-KR Link / KR Snapshot）

**职责**: 为“承诺任务”和“自动任务完成摘要”提供稳定的数据基础。

**改动概述**:

- 在 `taskKrLinks`（及如有必要的定义级 link）引入“是否计入本期承诺”的字段。
- 明确该字段的默认值为 `false`，只有显式纳入承诺后才参与 KR 自动摘要。
- 评估是否需要保留 `key_results.current_value` 作为纯手工字段/兼容字段，或从读取链路中彻底降级。

**关键接口 / 行为**:

```text
task <-> key result link
  - keyResultId
  - taskId
  - countsTowardCommitment: boolean
  - committedAt?: timestamp
```

**注意事项**:

- 需要兼容 SQLite / Postgres 双 schema。
- 迁移后旧 link 默认值如何设定需要在实现时保守处理，避免无意把全部历史关联都视为承诺任务。

### Module: OKR Service Aggregation

**职责**: 统一产出 KR 自动任务完成摘要和“最近 check-in 判断”读取结果。

**改动概述**:

- 为 `okr-service` 增加新的聚合函数，如 `getKeyResultTaskProgressSnapshot`。
- `getKeyResultDetail`、`getCurrentPeriodSummary`、`listRiskKeyResults` 等函数统一改为消费新摘要。
- `getKeyResultProgressSnapshot` 需要重定义或拆分，避免继续把“最新 check-in 进度值”当作默认执行进展。

**关键接口 / 行为**:

```text
getKeyResultTaskProgressSnapshot(keyResultId) ->
  {
    committedTaskCount,
    completedCommittedTaskCount,
    openCommittedTaskCount,
    hasCommittedTasks,
    lastTaskProgressAt?,
  }

getKeyResultDetail(keyResultId) ->
  {
    ...keyResult,
    taskProgress,
    latestCheckInSummary,
    confidence,
  }
```

**注意事项**:

- 读取层应尽量避免每个 KR 单独查任务，优先设计可批量聚合的路径。
- 现有 `currentValue` 的对外暴露语义会变模糊，需要在 plan 之后的 tasks/implement 阶段统一替换消费方。

### Module: Task Service / Task UI

**职责**: 维护任务与 KR 的“承诺任务”关系。

**改动概述**:

- 任务创建、编辑、关联 KR 的入口需要支持标记某个关联是否计入本期承诺。
- 对重复任务，要确保统计作用于实例级任务，而不是定义级模板。

**关键接口 / 行为**:

```text
create/update task
  - key result links: existing behavior
  - new per-link commitment flag: optional, explicit opt-in
```

**注意事项**:

- 需要保持“仅关联、不计入承诺”这一状态可见，否则用户会困惑为什么已关联任务没进入摘要。
- 如果当前 UI 不支持逐 link 配置，第一版可考虑在 KR 详情页或任务表单中增加最小可用控制。

### Module: Dashboard / Review / Activity

**职责**: 消费新模型并重新定义风险口径。

**改动概述**:

- dashboard 风险 KR 卡片改为展示“低信心 / 长期未 check-in / 任务无推进 / 显式 at_risk”的组合结果。
- review 生成从“基于 check-in 的 KR 进展”扩展为“任务完成摘要 + 最近 check-in 判断”。
- activity 保留当前 task / check-in 轨迹，不要求新增复杂的自动摘要变更日志，除非实现中发现缺失明显可解释性。

**关键接口 / 行为**:

```text
risk KR if:
  - status = at_risk
  OR latest check-in confidence = low
  OR no recent check-in AND no recent committed-task progress

review KR summary:
  - title
  - completed/committed task counts
  - latest check-in summary
  - latest confidence
```

**注意事项**:

- 这是业务规则变化，不只是字段替换，测试需要覆盖误报回归。
- `reviewKrSnapshots` 当前存 `currentValue`；后续需要决定是否换成计数摘要结构。

---

## Data Model

本需求建议补充单独的 [data-model.md](data-model.md)，因为数据关系与读取语义都有变化：

- `taskKrLinks` 需要新增承诺标记
- `KR Task Progress Snapshot` 成为新的读取实体
- `reviewKrSnapshots` 的 snapshot 结构可能需要调整
- `key_results.currentValue` 在新模型中的定位需要明确为兼容字段或降级字段

---

## Project Structure

```text
apps/web/src/
├── [修改] app/(dashboard)/okr/page.tsx
├── [修改] app/(dashboard)/okr/okr-client.tsx
├── [修改] app/(dashboard)/okr/[id]/page.tsx
├── [修改] app/(dashboard)/okr/[id]/check-in-form.tsx
├── [修改] app/(dashboard)/dashboard/page.tsx
├── [修改] app/(dashboard)/review/review-client.tsx
├── [修改] app/(dashboard)/tasks/*  (任务与 KR 关联入口)
├── [修改] app/api/v1/okr/**/*.ts
├── [修改] lib/services/okr-service.ts
├── [修改] lib/services/task-service.ts
├── [修改] lib/services/review-service.ts
└── [修改] lib/presentation/labels.ts

packages/db/src/
├── [修改] schema/sqlite.ts
├── [修改] schema/postgres.ts
└── [新增/修改] migrations/*

apps/web/src/__tests__/
├── [修改] okr/okr-service.test.ts
├── [修改] review/review-service.test.ts
├── [修改] dashboard/dashboard-summary.test.ts
├── [修改] tasks/task-service.test.ts
└── [修改] api/okr-routes.test.ts
```

---

## Risks and Tradeoffs

- 历史任务-KR 关联没有“承诺任务”标记，迁移默认值如果处理不当，会直接改变所有 KR 自动摘要结果。
- `currentValue` 目前被多处读取，若替换不彻底，会出现“有些页面看摘要，有些页面还看旧值”的语义分裂。
- review 快照当前存的是 `currentValue`，新模型若不调整，复盘会继续保留旧语义。
- 风险 KR 规则从单一 check-in 信号变为组合信号，业务解释更合理，但测试面会扩大。

---

## Verification Strategy

- 服务层单测：
  - 承诺任务/非承诺任务的统计隔离
  - 重复任务实例统计
  - 任务完成/恢复/解绑后的摘要重算
  - 风险 KR 新口径
- API / route 测试：
  - KR detail/list/current/review context 返回新摘要结构
  - check-in 路由仍保持兼容
- UI 验证：
  - OKR 列表页显示 `已完成 / 已承诺`
  - KR 详情页能同时看见自动摘要与最近 check-in
  - dashboard 风险 KR 文案与数量合理
  - review 草稿包含任务摘要与最近判断
- 基础校验：
  - `pnpm --filter @stride-os/web typecheck`
  - 相关测试子集

---

## Design Artifacts

本次计划涉及的产物：

| 产物 | 是否需要 | 说明 |
|------|---------|------|
| plan.md | 必须 | 主实现计划 |
| data-model.md | 需要 | 涉及关系字段、聚合视图和 snapshot 结构变化 |
| tasks.md | 后续阶段生成 | 由 `tasks` 阶段产出 |
| acceptance.md | 后续阶段生成 | 用于最终验收结论 |

---

## Notes

- 该 feature 的真实目标已经从“自动推导 KR 百分比进度”收缩为“自动提供 KR 任务完成摘要，并重定义 check-in 的职责”。
- 现有 spec/workspace 名称仍为 `derive-kr-progress-from-tasks`，可保留以避免中途切换工作区；但后续文案应尽量使用新语义。
- 若实现阶段发现 `progressValue` 在 check-in 中已不适合作为字段名，可在 tasks/implement 阶段评估是否需要兼容层，而不是在 plan 阶段提前扩大范围。

---

## Sources

| 决策 | 来源 URL | 备注 |
|------|---------|------|
| 保持 `useActionState` + Server Action 模式 | https://react.dev/reference/react/useActionState | 与当前 React 19 / Next 16 代码风格一致 |
| 其余业务规则决策 | UNVERIFIED | 基于本次需求澄清，而非框架官方文档 |
