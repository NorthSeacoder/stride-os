# Feature Specification: Expand Automation API

**Feature Branch**: `expand-automation-api`  
**Created**: 2026-05-13  
**Status**: Draft  
**Input**: User request: "补充 API 功能，用于 NAS 上的 Hermes 调用获取每日复盘、新增 OKR/task、task 提醒等功能；以及命令行对 OKR/task/复盘等模块进行增删改查。"

## Background & Goal

Stride OS 当前已经有 Bearer token 认证能力和一组 `/api/v1/*` 接口。现状能读取当前 OKR、读取部分 task 视图、创建 key result check-in、生成/保存/更新复盘草稿，并保留了 `examples` 这类示例 CRUD 接口。

用户后续希望把 Stride OS 作为可被自动化系统调用的个人操作系统后端：

- NAS 上的 Hermes 可以通过 API 获取每日复盘上下文、创建 OKR/task、触发或查询 task 提醒。
- 命令行工具可以通过 API 对 OKR、task、复盘等核心模块执行增删改查。

本规格目标是补齐面向自动化和 CLI 的核心业务 API 能力，并让这些能力具备稳定、可发现、可验证的契约。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Hermes 读取每日复盘上下文 (Priority: P1)

作为运行在 NAS 上的 Hermes，我希望用 API key 获取指定复盘周期所需的上下文，包括周期内任务、逾期任务、完成事项、当前 OKR 和关键结果进展，这样可以生成每日、每周或每月复盘。

**Why this priority**: 这是 Hermes 自动化的基础读取能力，不涉及直接写入业务数据，风险相对低，但能立即支撑每日总结。

**Independent Test**: 使用有效 Bearer token 请求复盘上下文接口，默认返回当天上下文；传入 weekly/monthly 或显式时间范围时返回对应周期上下文；不带 token 返回 401；数据中包含任务、OKR、复盘相关摘要。

**Acceptance Scenarios**:

1. **Given** 用户有有效 API key，**When** Hermes 请求复盘上下文且不传时间范围，**Then** 系统返回当天可用于日复盘的结构化上下文。
2. **Given** 用户请求 weekly 或 monthly 复盘上下文，**When** Hermes 传入复盘类型或时间范围，**Then** 系统返回对应周期内的任务、完成事项、OKR 进展和历史复盘信息。
3. **Given** 用户没有对应周期任务或当前 OKR，**When** Hermes 请求上下文，**Then** 系统返回空集合或明确的空状态，而不是 500。
3. **Given** API key 无效、过期或已撤销，**When** Hermes 请求上下文，**Then** 系统返回 401。

---

### User Story 2 - Hermes 创建 OKR 和任务 (Priority: P1)

作为 Hermes，我希望在获得用户明确指令后，通过 API 创建 OKR 周期、目标、关键结果和任务，这样用户可以用自然语言把计划落到 Stride OS。

**Why this priority**: 这是自动化写入的核心能力，直接影响 OKR 和任务管理闭环。

**Independent Test**: 使用有效 Bearer token 创建 OKR 对象、关键结果和任务，随后能通过读取接口查到这些对象；缺少必填字段时返回 400。

**Acceptance Scenarios**:

1. **Given** 用户要求新增任务，**When** Hermes 调用任务创建 API，**Then** 系统创建任务并返回任务 ID、标题、状态、截止日期、优先级等核心字段。
2. **Given** 用户要求新增 OKR，**When** Hermes 依次创建周期、目标和关键结果，**Then** 新增内容出现在当前 OKR 读取结果中。
3. **Given** 请求字段无效，**When** Hermes 调用写入 API，**Then** 系统返回可读的校验错误，不产生脏数据。

---

### User Story 3 - Hermes 查询和触发任务提醒 (Priority: P2)

作为 Hermes，我希望查询即将到期、逾期、今天待办和需要提醒的任务，这样可以由 Hermes 的定时任务在聊天或通知渠道中提醒用户。

**Why this priority**: 提醒是 Hermes 场景的重要自动化入口，但提醒渠道、频率和确认机制需要边界清晰。

**Independent Test**: 使用有效 Bearer token 查询待提醒任务，返回符合时间窗口的任务列表；系统不保存提醒处理状态，重复提醒节奏由 Hermes 控制。

**Acceptance Scenarios**:

1. **Given** 存在今天到期或逾期未完成任务，**When** Hermes 查询提醒候选，**Then** 系统返回可提醒任务列表。
2. **Given** 某个任务仍符合提醒条件，**When** Hermes 的定时任务再次查询提醒候选，**Then** 系统仍返回该任务，由 Hermes 自行决定是否以及如何提醒。
3. **Given** 用户完成任务，**When** Hermes 查询提醒候选，**Then** 已完成任务不再作为待提醒项返回。

---

### User Story 4 - CLI 管理任务 (Priority: P1)

作为命令行用户，我希望通过 API 对任务执行增删改查、完成、恢复、移动象限、关联/解除关联 OKR，这样可以在终端中管理日常任务。

**Why this priority**: task 是最频繁的命令行操作对象，现有 API 只有查询视图，不足以支撑 CLI。

**Independent Test**: CLI 或 curl 能通过 Bearer token 创建任务、查询任务详情、更新任务、完成任务、归档任务，并看到一致结果。

**Acceptance Scenarios**:

1. **Given** 有效 API key，**When** CLI 创建任务，**Then** 系统返回新任务并可按 ID 查询。
2. **Given** 已存在任务，**When** CLI 修改标题、截止日期、优先级、备注或完成状态，**Then** 后续查询返回更新后的值。
3. **Given** 已存在任务，**When** CLI 归档任务，**Then** 默认任务列表不再返回该任务。

---

### User Story 5 - CLI 管理 OKR (Priority: P1)

作为命令行用户，我希望通过 API 对 OKR 周期、目标、关键结果和 check-in 执行增删改查或归档，这样可以不进入 Web UI 也能维护 OKR。

**Why this priority**: OKR 是 Stride OS 的核心结构，当前服务层已有部分写能力，但外部 API 暴露不足。

**Independent Test**: CLI 或 curl 能创建周期、目标、关键结果，更新状态和进度，写入 check-in，并查询详情和列表。

**Acceptance Scenarios**:

1. **Given** 有效 API key，**When** CLI 创建 OKR 周期，**Then** 系统返回周期信息并可查询。
2. **Given** 已存在周期，**When** CLI 创建目标和关键结果，**Then** 它们出现在该周期的 OKR 结构中。
3. **Given** 已存在关键结果，**When** CLI 写入 check-in，**Then** 关键结果进展和 check-in 历史可查询。

---

### User Story 6 - CLI 管理复盘 (Priority: P2)

作为命令行用户，我希望通过 API 创建、查询、更新、定稿和归档复盘，这样可以把复盘流程纳入脚本或终端工作流。

**Why this priority**: 当前复盘 API 已有列表、草稿保存、草稿更新和定稿能力，补齐归档和详情查询后更适合 CLI。

**Independent Test**: CLI 或 curl 能保存复盘草稿、查询详情、更新内容、定稿、归档，并按类型和时间范围查询历史。

**Acceptance Scenarios**:

1. **Given** 有效 API key，**When** CLI 保存复盘草稿，**Then** 系统返回草稿 ID。
2. **Given** 已存在草稿，**When** CLI 更新并定稿，**Then** 复盘状态变为 final。
3. **Given** 已存在复盘，**When** CLI 归档，**Then** 默认历史列表不再显示该复盘。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须继续支持 `Authorization: Bearer <token>` 作为自动化和 CLI API 的认证方式。
- **FR-002**: 系统必须为核心业务 API 返回一致的 JSON 响应结构，包括成功数据、校验错误、未授权错误和未找到错误。
- **FR-003**: 系统必须提供面向 Hermes 的复盘上下文读取能力，默认覆盖当天任务、当天完成事项、当天相关复盘上下文、当前 OKR 和关键结果进展；接口必须支持传入复盘类型或明确时间范围，以覆盖 daily、weekly、monthly 等复盘场景。
- **FR-004**: 系统必须提供任务的创建、查询列表、查询详情、更新、完成/恢复和归档能力；对外删除语义应落到归档，不硬删除历史数据。
- **FR-005**: 系统必须提供任务按常用视图查询的能力，包括 today、inbox、quadrants，以及 Hermes 提醒所需的 due soon/overdue/today 视图。
- **FR-006**: 系统必须支持任务与 key result 的关联查询和维护，以便 CLI 或 Hermes 能把任务挂到 OKR 下。
- **FR-007**: 系统必须提供 OKR 周期的列表、详情、创建、更新和归档能力。
- **FR-008**: 系统必须提供 Objective 的列表、详情、创建、更新和归档能力。
- **FR-009**: 系统必须提供 Key Result 的列表、详情、创建、更新、归档、check-in 创建和 check-in 历史查询能力。
- **FR-010**: 系统必须提供复盘的列表、详情、草稿创建/保存、草稿更新、定稿和归档能力；对外删除语义应落到归档，不硬删除历史数据。
- **FR-011**: 系统必须支持按时间范围和类型查询复盘，至少覆盖 weekly、monthly、period。
- **FR-011a**: 复盘上下文接口必须支持客户端传入开始日期、结束日期或复盘类型；未传入时默认使用当天。
- **FR-012**: 系统必须为自动化写操作记录审计日志；MVP 不需要 API token scope 或权限分级，调用来源可通过 token name、用户和审计 action 判断。
- **FR-013**: 系统必须更新 API 契约，使 CLI 和 Hermes 能发现可用接口、请求字段和响应字段。
- **FR-014**: 系统必须保证无效 token、过期 token、撤销 token 对所有受保护 API 返回 401。
- **FR-015**: 系统必须保证写操作具备字段校验，缺少必填字段、枚举值非法、日期格式非法时返回 400。
- **FR-016**: 系统必须避免将 `examples` 作为核心业务 API 的一部分对外推荐；它可以保留为示例或测试资源。
- **FR-017**: 系统必须保留现有 Web UI 所依赖的服务行为和数据语义，新增 API 不应破坏现有页面。

### Non-Functional Requirements *(if applicable)*

- **NFR-001**: API 响应必须适合命令行消费，避免返回 HTML 登录页作为业务错误。
- **NFR-002**: API 必须保持向后兼容，现有 `/api/v1/*` 路由不应无故改名或改变核心响应含义。
- **NFR-003**: MVP 不要求显式支持 `Idempotency-Key`；Hermes 和 Stride OS 暂时都运行在 NAS Docker 环境内，先按单条请求和调用方可控重试推进。
- **NFR-004**: Hermes 和 CLI 的错误信息必须足够明确，便于脚本判断是认证失败、校验失败、资源不存在还是业务状态冲突。
- **NFR-005**: API 契约和测试必须覆盖新增核心路径，避免部署后只有代码可用但契约缺失。

### Key Entities *(if applicable)*

- **API Token**: 用户生成的个人访问 token，用于 Hermes 和 CLI 调用受保护 API。
- **Hermes Client**: NAS 上运行的自动化调用方，用于读取复盘上下文、创建 OKR/task、处理提醒。
- **CLI Client**: 用户在终端中使用的命令行调用方，用于对核心模块执行增删改查。
- **Task**: 用户的任务，可包含标题、备注、描述、列表、截止日期、优先级、精力、完成状态、象限、关联 key results。
- **Task Reminder Candidate**: 可提醒任务，由截止日期、逾期状态和完成状态决定；系统不保存提醒处理状态，Hermes 作为周期性定时任务自行决定提醒节奏。
- **OKR Period**: OKR 周期，例如 year、quarter、month 或 custom。
- **Objective**: OKR 目标，归属于周期。
- **Key Result**: 关键结果，归属于目标，可有类型、目标值、当前值、状态和 check-in 历史。
- **KR Check-in**: 对关键结果进展的一次记录。
- **Review**: 复盘记录，包含类型、周期范围、标题、正文、结构化摘要、关联 key results 和状态。

## Business Metrics *(optional — 上线后度量)*

- Hermes 复盘上下文 API 调用成功率，按 daily、weekly、monthly 区分。
- CLI/API 写操作成功率和校验失败率。
- API token 调用中 401、400、404、409 的错误分布。
- 由 Hermes 或 CLI 创建的任务、OKR、复盘数量。
- 提醒候选返回数量、提醒处理数量和重复提醒率。

## Out of Scope *(if applicable)*

- 不在本规格中实现完整 CLI 程序本体；本规格只要求后端 API 和契约足以支撑 CLI。
- 不在本规格中实现 Hermes 的自然语言理解、对话策略或消息发送渠道。
- 不在本规格中重做 Web UI。
- 不在本规格中设计多用户组织级权限模型；当前目标是个人 API token 场景。
- 不在本规格中移除现有 `examples` 接口。
- 不在本规格中要求公开无认证 API 文档页面；是否提供公开或登录后可见文档由后续设计决定。
- 不在 MVP 中支持批量创建、批量更新、批量完成或批量归档；CLI 和 Hermes 先通过单条 API 调用组合完成批量场景。
- 不在 MVP 中支持显式 idempotency key；若后续发现 Docker 内调用、网络重试或定时任务导致重复写入，再单独补充。

## Unclear Questions *(if applicable)*

No remaining blocking clarifications.
