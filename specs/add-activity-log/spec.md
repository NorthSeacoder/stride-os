# Feature Specification: Activity Log Panel

**Workspace**: `add-activity-log`  
**Date**: 2026-05-13  
**Input**: 用户希望增加一个操作记录面板，主要记录 OKR/task 的变动；变动来源除了页面操作，也包括 Hermes agent 或其他 agent 通过命令行/API 发起的操作。用户关心应记录哪些字段、支持哪些查询条件、页面如何展示，以及是否能在不大修现有代码的前提下实现。

## Background & Goal

Stride OS 当前已经具备个人 OKR、Task、Review、PAT/API 和基础审计日志能力。现有审计日志已经用于登录、退出、Token 创建和撤销，但 OKR/task 领域变动缺少面向用户可查看的操作记录。

本需求目标是提供一个可追踪 OKR/task/Review 关键变动的 Activity Log 能力，让用户能回答：

- 最近哪些任务或 OKR 被创建、更新、完成、归档或 check-in？
- 这些变动是谁触发的，是用户在页面操作，还是 Hermes/其他 agent 通过自动化入口触发？
- 某个 task、objective 或 key result 的历史变化是什么？
- 自动化 agent 做了哪些实际改动，是否可以快速审查？

该功能应优先服务个人执行系统的可解释性、可审计性和 agent 操作可回溯性。

## User Scenarios

### US1 - View Recent Activity

As a personal user, I want to open an operation log panel and see recent OKR/task changes in reverse chronological order, so that I can quickly understand what changed today or this week.

**Acceptance**:

- The panel shows recent domain changes with timestamp, actor, action, target, source, and a readable summary.
- The newest records appear first.
- Empty state is clear when no matching records exist.

### US2 - Review Agent Changes

As a personal user, I want to filter activity by Hermes or another agent, so that I can review what automated tools changed.

**Acceptance**:

- Activity can be filtered by source or actor type.
- Records triggered by automation are distinguishable from records triggered by manual web UI usage.
- The log includes enough context to understand the changed target without opening raw database rows.

### US3 - Inspect One Target's History

As a personal user, I want to see the history of a single task, objective, or key result, so that I can understand how its status, progress, or scheduling changed over time.

**Acceptance**:

- A detail context can request activity for one target type and ID.
- The result includes all relevant records for that target.
- For update records, changed fields are visible at a human-readable level.

### US4 - Trace OKR Progress Changes

As a personal user, I want KR check-ins and progress/status changes to appear in activity, so that progress movement is auditable.

**Acceptance**:

- KR check-ins are recorded as first-class activity.
- Updates to KR status, confidence, current value, or target metadata appear in the log.
- Activity summaries distinguish progress check-ins from generic edits.

### US5 - Support Command-Line/API Write Paths

As an agent operator, I want command-line or API based changes to create the same kind of activity records as page operations, so that all supported write paths are visible in one log.

**Acceptance**:

- Supported external write paths record actor/source information.
- Activity records can distinguish web UI, API, CLI, Hermes, and other agent-originated changes when that information is available.
- Missing or unknown source information is represented explicitly instead of silently pretending it was manual user action.
- Direct database writes outside official CLI/API/application service paths are not a supported activity capture path.

### US6 - Review Key Review Changes

As a personal user, I want important Review draft and status changes to appear in the same activity surface, so that the OKR execution loop remains auditable when Hermes or another agent helps with review work.

**Acceptance**:

- Review draft create/update, finalize, and archive operations are recorded.
- Review activity is distinguishable from task and OKR activity.
- Routine reads or editor keystrokes are not recorded as activity.

## Functional Requirements

- **FR-001**: The system must record domain activity for task creation, task update, task completion, task restore, task archive, task list movement, due date changes, priority changes, and task-KR relationship changes.
- **FR-002**: The system must record domain activity for OKR period creation/update/archive, objective creation/update/archive, key result creation/update, and key result check-in.
- **FR-003**: Each activity record must identify the action, target type, target ID, timestamp, actor type, actor ID when available, source when available, and a human-readable summary.
- **FR-004**: Update activity must include changed field names and before/after values for important user-facing fields when those values are available.
- **FR-005**: Activity records must include enough target context for display, such as target title/name at the time of the event when available.
- **FR-006**: The activity query experience must support filtering by time range, target type, target ID, action, actor type, actor ID, source, and keyword.
- **FR-007**: The global activity panel must display records in reverse chronological order and support pagination or incremental loading.
- **FR-008**: A target-specific history view must be available for task, objective, and key result contexts, either as a detail panel section or as a reusable embedded activity list.
- **FR-009**: Activity records from Hermes or other agents must be visually distinguishable from manual web UI records.
- **FR-010**: Failed operations must not create successful domain activity records. If failure auditing is added, it must be visually and semantically distinct from successful changes.
- **FR-011**: Existing authentication and token audit records should remain compatible with the activity system, but this feature is focused on OKR/task domain activity.
- **FR-012**: The feature must work for both local SQLite and deployed PostgreSQL modes.
- **FR-013**: Review draft create/update, finalize, and archive operations must be recorded as first-release activity.
- **FR-014**: Activity capture for command-line and agent operations is required only for official CLI/API/application service paths. Arbitrary direct database writes are outside the supported capture boundary.
- **FR-015**: Activity records must be retained indefinitely in the first release, with no automatic retention cleanup requirement.

## Non-Functional Requirements

- **NFR-001**: The feature should be incremental and should not require rebuilding the OKR/task domain model.
- **NFR-002**: The activity panel should remain usable with hundreds to thousands of records through filtering and paginated/incremental loading.
- **NFR-003**: Activity display should avoid exposing secrets, token hashes, raw credentials, or sensitive request payloads.
- **NFR-004**: The activity record format should be stable enough for future agent-facing APIs to consume.
- **NFR-005**: Existing OKR/task flows should continue to behave normally if activity display fails; activity write failures should be handled deliberately during planning.
- **NFR-006**: The UI should be dense and operational, matching the existing dashboard/task workspace style rather than a marketing-style timeline.

## Scope

### In Scope

- Recording successful OKR/task domain mutations.
- Recording key Review lifecycle mutations.
- Recording actor/source information for web UI and supported API/agent write paths.
- Querying and displaying recent/global activity.
- Querying and displaying target-specific activity history.
- Human-readable summaries and field-level diff for important fields.
- Compatibility with existing SQLite/PostgreSQL project modes.

### Out of Scope

- Full event sourcing or rebuilding current domain tables from activity records.
- Reverting changes from the activity panel.
- Collaborative multi-user audit policy beyond the current user/API token model.
- Recording every read/view/search action.
- Long-term compliance audit features such as immutable append-only storage, legal hold, or signed audit trails.
- Capturing direct database writes performed outside supported application/CLI/API paths.
- Automatic activity retention cleanup or archival.

## Query Requirements

The activity query surface must support:

- Time range: today, this week, this month, custom start/end.
- Target: target type and optional target ID.
- Actor: actor type and optional actor ID.
- Source: web, API, CLI, Hermes, other agent, system, or unknown.
- Action: create, update, complete, restore, archive, check-in, link, unlink, move, or equivalent domain action categories.
- Keyword: search target title, summary, command/source label, or other display-safe metadata.
- Changed field: filter records that changed a specific field such as status, due date, priority, current value, confidence, or list.

## Display Requirements

- The global panel should show a compact timeline or list with timestamp, actor/source badge, action label, target title, and concise summary.
- Each row should support expanding to show changed fields when a diff exists.
- Agent-originated rows should be recognizable without relying only on text.
- Target-specific history should reuse the same display rules but be scoped to the current task/objective/key result.
- Empty, loading, and error states must be handled.

## Clarified Decisions

- Command-line and agent activity capture is required only for official CLI/API/application service paths. Direct database writes by arbitrary scripts are outside scope.
- First-release activity records are retained indefinitely. Retention cleanup can be added in a later feature if needed.
- Review draft create/update, finalize, and archive operations are included in the first release as key activity events.

## Success Criteria

- A user can open an activity panel and understand recent OKR/task changes without inspecting raw database rows.
- A user can filter activity to review changes made by Hermes or another agent.
- A user can inspect the history of a specific task, key result, or review.
- Supported web/API/agent write paths produce consistent activity records.
- Existing auth/token audit behavior is not broken.
- The implementation can proceed without a wholesale rewrite of the existing OKR/task model.
