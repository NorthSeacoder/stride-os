# Feature Specification: Personal OKR Alpha

**Workspace**: `stride-os`
**Created**: 2026-05-09
**Status**: Draft
**Input**: 用户描述: "基于 docs/plans/2026-05-05-personal-okr-system-design.md 的最初需求，结合当前项目内容，收敛一个个人 OKR Alpha：Tasks 默认 Today，Today 分 Must / Focus，保留四象限视图，KR 进度以 check-in 为准，Review 草稿可保存，并提供 API 方便 Hermes agent 接入。"

---

## Background & Goal

当前项目已经具备基础底座：单用户登录、Personal Access Token、受保护 dashboard/settings、示例 CRUD、API 路由、OpenAPI 包、Drizzle 数据层。原始设计文档定义了一个完整的个人 OKR operating system，但范围包含日历、四象限、导入导出、后台任务、复盘趋势等多个子系统。

本 Alpha 的目标是收敛成一个可日用的个人执行闭环：

1. 用户每天从 Today 进入，明确今天必须完成和重点推进的任务。
2. 任务可以关联 KR，作为 OKR 推进的执行素材。
3. KR 进度通过 check-in 明确更新，任务完成不直接自动改 KR 最终进度。
4. 用户可以用四象限查看和调整任务重要性/紧急性。
5. 系统可以聚合一周数据生成复盘草稿，并保存成正式 review。
6. Hermes agent 可以通过 API 查询、生成、保存 review 草稿。

Dashboard 在本 Alpha 中作为聚合页后置实现：它展示已有 OKR、Task、Review 数据，不作为第一批业务数据入口。

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage Today Work (Priority: P1)

作为个人用户，我希望 `/tasks` 默认展示 Today，并把今天任务区分为 Must 和 Focus，以便每天先处理真正需要推进的事项。

**Why this priority**: Task 是最高频输入和执行入口；没有 Today-first 的待办体验，OKR 数据难以持续产生。

**Acceptance Scenarios**:

1. **US1-1 View Today by default**
   **Given** 用户已登录并存在任务
   **When** 用户打开 `/tasks`
   **Then** 系统默认展示 Today 任务，并按 Must 和 Focus 分组

2. **US1-2 Create inbox task**
   **Given** 用户在任务模块
   **When** 用户创建新任务且未指定 Today 或计划日期
   **Then** 任务进入 Inbox，不出现在 Today 分组

3. **US1-3 Move task into Today**
   **Given** 用户有 Inbox 或 Scheduled 任务
   **When** 用户将任务加入 Today
   **Then** 用户必须选择 Must 或 Focus，任务出现在对应 Today 分组

4. **US1-4 Complete task**
   **Given** 用户有 Today 任务
   **When** 用户标记任务完成
   **Then** 任务进入 Done，记录完成时间，并不再出现在 Today 未完成列表

**Edge Cases**:

- **US1-5** 没有 Today 任务时，系统显示空状态并提供从 Inbox 创建或拉入任务的入口。
- **US1-6** 已完成任务不能继续显示在未完成的 Must / Focus 分组。
- **US1-7** Today 任务如果被取消，应从 Today 工作列表移除，但保留历史状态。

### User Story 2 - Connect Tasks to OKR (Priority: P1)

作为个人用户，我希望任务可以关联一个或多个 KR，以便任务执行能回流到 OKR 进展和周复盘素材。

**Why this priority**: Alpha 的核心不是普通 todo，而是 OKR 驱动的执行系统。

**Acceptance Scenarios**:

1. **US2-1 Link task to KR**
   **Given** 用户已有 KR 和任务
   **When** 用户在任务详情中关联 KR
   **Then** 任务在该 KR 详情中可见

2. **US2-2 View KR tasks**
   **Given** 某个 KR 关联了任务
   **When** 用户打开 KR 详情
   **Then** 系统展示关联任务及其状态

3. **US2-3 Completed task as progress material**
   **Given** 用户完成了关联 KR 的任务
   **When** 系统生成周复盘草稿或展示 KR 详情
   **Then** 已完成任务作为 KR 进展素材展示，但不自动修改 KR 最终进度

**Edge Cases**:

- **US2-4** 一个任务可以不关联 KR，仍可作为普通任务管理。
- **US2-5** 一个任务可以关联多个 KR。
- **US2-6** 删除或取消任务时，KR 历史 check-in 不应被改写。

### User Story 3 - Maintain OKR and KR Check-ins (Priority: P1)

作为个人用户，我希望创建周期、Objective、KR，并通过 check-in 更新 KR 进度和信心，以便真实记录目标推进状态。

**Why this priority**: KR check-in 是 OKR 系统和普通任务系统的分界线。

**Acceptance Scenarios**:

1. **US3-1 Create OKR structure**
   **Given** 用户已登录
   **When** 用户创建周期、Objective 和 KR
   **Then** 系统保存结构并能在 OKR 页面查看

2. **US3-2 Record KR check-in**
   **Given** 用户已有 KR
   **When** 用户填写 check-in
   **Then** 系统记录当前进度、confidence、summary、blockers、next actions

3. **US3-3 Progress source of truth**
   **Given** 用户完成了多个关联 KR 的任务
   **When** 用户查看 KR 当前进度
   **Then** KR 最终进度以最近有效 check-in 为准

**Edge Cases**:

- **US3-4** KR 没有 check-in 时，系统应显示未更新状态，而不是根据任务完成数推断进度。
- **US3-5** confidence 至少支持 low、medium、high。
- **US3-6** 已归档周期中的 OKR 应可查看，但不作为默认活跃工作区。

### User Story 4 - Use Quadrants to Review Tasks (Priority: P2)

作为个人用户，我希望按重要/紧急四象限查看任务，并快速调整任务象限，以便做日常优先级决策。

**Why this priority**: 四象限是任务决策视图，能提高 Today 和 Inbox 的整理效率，但它依赖 Task 基础能力。

**Acceptance Scenarios**:

1. **US4-1 View quadrants**
   **Given** 用户已有任务并设置了 important / urgent
   **When** 用户打开 `/quadrants`
   **Then** 系统按四象限展示任务

2. **US4-2 Change quadrant**
   **Given** 用户在四象限视图
   **When** 用户调整任务的重要性或紧急性
   **Then** 任务移动到对应象限

3. **US4-3 Preserve task status**
   **Given** 用户调整任务象限
   **When** 调整完成
   **Then** 系统只改变 important / urgent，不改变 Inbox、Today、Scheduled、Done 等任务状态

**Edge Cases**:

- **US4-4** 第一版不要求拖拽；点击或表单调整即可满足验收。
- **US4-5** 已完成任务默认不出现在待处理四象限，可通过筛选查看。

### User Story 5 - Generate and Save Weekly Review (Priority: P2)

作为个人用户，我希望系统基于本周任务和 KR check-in 生成可编辑周复盘草稿，并保存为正式 review，以便形成持续复盘记录。

**Why this priority**: Review 是 OKR 闭环最后一步，也是 Hermes agent 最有价值的介入点。

**Acceptance Scenarios**:

1. **US5-1 Generate weekly draft**
   **Given** 用户本周有任务完成、未完成 Must、KR check-in 或 blocker
   **When** 用户生成周复盘草稿
   **Then** 系统返回结构化草稿和可编辑正文

2. **US5-2 Save draft review**
   **Given** 用户获得周复盘草稿
   **When** 用户保存
   **Then** 系统创建 review，状态为 draft

3. **US5-3 Mark review final**
   **Given** 用户已编辑 review draft
   **When** 用户确认完成
   **Then** review 状态变为 final，并可在 Review 历史中查看

4. **US5-4 Generate via API**
   **Given** Hermes agent 持有有效 API token
   **When** agent 调用周复盘草稿 API
   **Then** API 返回和 UI 一致的数据结构

**Edge Cases**:

- **US5-5** 本周没有足够数据时，草稿仍应生成，但明确显示数据为空或不足。
- **US5-6** 保存 review 不应重复创建同一周 final review，除非用户明确创建新版本或继续编辑 draft。
- **US5-7** Hermes 可以保存 draft，但 final 状态应由用户确认或由明确 API 参数指定。

### User Story 6 - See Aggregated Dashboard (Priority: P3)

作为个人用户，我希望 Dashboard 汇总当前周期、今日任务、风险 KR 和最近复盘，以便快速了解系统状态。

**Why this priority**: Dashboard 依赖 OKR、Task、Review 数据，适合作为 Alpha 后段聚合页。

**Acceptance Scenarios**:

1. **US6-1 Current cycle summary**
   **Given** 用户已有当前周期 OKR
   **When** 用户打开 Dashboard
   **Then** 系统展示当前周期摘要

2. **US6-2 Today summary**
   **Given** 用户已有 Today 任务
   **When** 用户打开 Dashboard
   **Then** 系统展示 Must / Focus 数量和关键任务

3. **US6-3 Risk KR summary**
   **Given** 用户有低 confidence 或长期无 check-in 的 KR
   **When** 用户打开 Dashboard
   **Then** 系统展示风险 KR

**Edge Cases**:

- **US6-4** 没有 OKR 或任务数据时，Dashboard 显示引导入口，而不是空白或错误。
- **US6-5** Dashboard 不创建业务数据，只展示和链接到底层模块。

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须支持周期、Objective、Key Result 的创建、查看、编辑、归档和历史查看。
- **FR-002**: 系统必须支持 KR check-in，并记录进度、confidence、summary、blockers、next actions 和时间。
- **FR-002a**: Alpha 必须支持 numeric、milestone、hybrid 三类 KR。
- **FR-003**: KR 当前进度必须以 check-in 为准，任务完成只能作为进展素材和复盘素材。
- **FR-004**: 系统必须支持待办任务管理，默认任务入口为 Today。
- **FR-005**: Today 任务必须区分 Must 和 Focus。
- **FR-006**: 未安排的新任务默认进入 Inbox。
- **FR-007**: 系统必须支持 Scheduled 和 Done 任务视图。
- **FR-008**: 任务必须支持状态、计划日期、截止日期、完成时间、重要性、紧急性、优先级、能量、备注。
- **FR-008a**: 任务 priority 必须支持 P1、P2、P3，其中 P1 表示最高优先级。
- **FR-008b**: 任务 energy 必须支持 low、medium、high，用于表达完成任务所需精力。
- **FR-009**: 任务必须支持关联零个、一个或多个 KR。
- **FR-010**: 系统必须提供 KR 详情视图，展示关联任务和 check-in 历史。
- **FR-011**: 系统必须提供四象限任务视图，按 important / urgent 展示任务。
- **FR-012**: 四象限视图必须支持快速修改任务的重要性和紧急性。
- **FR-013**: 系统必须支持生成周复盘草稿。
- **FR-014**: 周复盘草稿必须至少聚合本周完成任务、未完成 Must、KR check-in、低 confidence KR、blockers 和下周重点建议。
- **FR-015**: 系统必须支持把周复盘草稿保存为 review draft，并支持确认为 final。
- **FR-016**: 系统必须提供 Review 历史查看。
- **FR-017**: 系统必须提供 Dashboard 聚合当前周期、Today 任务、风险 KR 和最近 review。
- **FR-018**: 系统必须提供 API，使 Hermes agent 能查询当前 OKR、Today、Inbox、KR 关联任务、四象限分布、周复盘草稿，并保存或更新 review。
- **FR-019**: API 必须复用现有 Personal Access Token 认证能力。
- **FR-020**: UI 和 API 必须基于同一业务语义；同一类数据在 UI 与 API 中不能出现互相矛盾的状态定义。
- **FR-021**: Hermes agent 必须可以通过 API 将 review 保存为 draft，也可以在显式请求时将 review 标记为 final。

### Non-Functional Requirements

- **NFR-001**: Alpha 面向单用户自部署，不引入团队、组织、权限协作流程。
- **NFR-002**: 系统必须适配当前项目的 Next.js App Router、Drizzle、SQLite/Postgres 双数据库底座。
- **NFR-003**: Agent API 返回结构应稳定、可机读，适合 Hermes agent 消费。
- **NFR-004**: Alpha 不要求后台任务队列；所有聚合可以由用户或 agent 主动触发。
- **NFR-005**: 页面应优先服务高频操作，避免把 Dashboard 做成第一数据入口。
- **NFR-006**: 任务、OKR、Review 的状态变化必须可追踪，避免静默覆盖关键历史。

### Key Entities

- **Period**: OKR 周期，表示年度、季度或其他个人周期；包含名称、起止日期、状态。
- **Objective**: 周期下的目标；包含标题、描述、状态和排序。
- **Key Result**: Objective 下的关键结果；包含标题、类型、目标值、当前进度、单位、状态。Alpha 支持 numeric、milestone、hybrid 三类。
- **KR Check-in**: KR 的进度记录；包含进度、confidence、summary、blockers、next actions、创建时间。
- **Task**: 待办任务；包含标题、备注、状态、Today 类型、计划日期、截止日期、完成时间、important、urgent、priority、energy。priority 为 P1/P2/P3；energy 为 low/medium/high。
- **Task KR Link**: 任务与 KR 的多对多关联。
- **Review**: 复盘记录；包含类型、时间范围、状态、标题、正文、结构化摘要。
- **Review KR Snapshot**: 复盘时刻的 KR 快照，用于保留历史判断。

---

## Business Metrics *(optional — 上线后度量)*

- **BM-001**: 用户一周内至少 5 天打开 Today 并完成或调整任务。
- **BM-002**: 每周至少生成并保存 1 条 weekly review。
- **BM-003**: 当前周期内大多数 KR 至少每周有 1 次 check-in。

---

## Out of Scope *(if applicable)*

本 Alpha 明确不包含：

- 团队 OKR、多人协作、权限分级、评论。
- 完整日历月/周拖拽视图。
- 复杂 recurring tasks。
- 四象限拖拽交互。
- markdown 数据导入和导出。
- pg-boss、Redis 或其他后台任务队列。
- AI 自动评价 OKR 成败。
- 文件上传、全文检索、提醒系统。
- 移动端原生 App。
- Dashboard 作为第一实现入口。

---

## Unclear Questions *(if applicable)*

无关键阻塞歧义。
