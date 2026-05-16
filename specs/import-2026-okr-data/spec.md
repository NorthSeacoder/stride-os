# Feature Specification: Import 2026 OKR Data

**Workspace**: `stride-os`  
**Created**: 2026-05-15  
**Status**: Draft  
**Input**: 用户描述: "这不是上半年了，这是整个 26 年的所有目标；补充枚举；可以接受直接写库，但之前要先去掉生成环境下的所有测试数据；先定好计划直到 tasks。"

---

## Background & Goal

当前项目已经具备个人 OKR Alpha 的核心能力：周期、Objective、Key Result、任务清单、任务、KR check-in、复盘和 API。用户已有一份历史 `okr-2026-h1.json` 和 Markdown OKR，但现在需要把目标范围调整为 2026 全年，并以项目数据库作为结构化真源。

本功能目标是在进入实际导入前，把数据准备和导入流程规格化：

1. 统一 OKR 周期相关枚举，确保 service、DB schema、migration 和 OpenAPI 表达一致。
2. 在生产环境导入个人真实数据前，清理旧的测试/演示业务数据，同时保留账号、认证和必要系统数据。
3. 准备可直接写库的 2026 全年 OKR 数据导入路径，支持清单、周期、Objective、KR 和后续任务关联。
4. 确保清理和导入过程可预览、可备份、可校验，并尽量幂等，避免重复导入或误删基础数据。

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Align OKR Period Enums (Priority: P1)

作为系统维护者，我希望 OKR 周期枚举在代码、数据库和 OpenAPI 中保持一致，以便后续通过 API 或脚本导入 2026 年度 OKR 时不会出现格式不兼容。

**Why this priority**: 枚举不一致会导致导入脚本、API contract 和数据库约束互相冲突，是导入前必须先处理的基础问题。

**Acceptance Scenarios**:

1. **US1-1 Year period is accepted**
   **Given** 导入数据使用 `type = "year"` 表示 2026 全年周期  
   **When** 通过 service 或直接写库创建周期  
   **Then** 数据库约束、service 校验和 OpenAPI schema 都接受该类型

2. **US1-2 Existing month/custom behavior remains valid**
   **Given** 系统已有 `month` 或 `custom` 周期能力  
   **When** 更新枚举定义  
   **Then** 不破坏现有合法周期类型

**Edge Cases**:

- **US1-3** 如果 OpenAPI 仍声明旧枚举，契约测试必须暴露不一致。
- **US1-4** 如果未来需要 `half`，可以作为显式枚举扩展，但 2026 全年导入不依赖 `half`。

### User Story 2 - Clean Production Business Test Data (Priority: P1)

作为系统维护者，我希望在导入真实 2026 OKR 前清理生产环境中的测试/演示业务数据，以便真实数据不会和旧的样例数据混杂。

**Why this priority**: 生产环境一旦混入测试 OKR、任务或复盘，会影响 Dashboard、Review、Hermes 查询和后续自动化判断。

**Acceptance Scenarios**:

1. **US2-1 Preview cleanup scope**
   **Given** 生产数据库中可能存在历史测试数据  
   **When** 执行清理前的 dry-run 或统计命令  
   **Then** 输出将被清理的业务表和记录数量，不实际删除数据

2. **US2-2 Preserve account and auth data**
   **Given** 生产数据库中存在用户、session、API token 和系统 inbox 清单  
   **When** 执行业务数据清理  
   **Then** 用户、session、API token、系统 inbox 清单不被删除

3. **US2-3 Remove old business data**
   **Given** 生产数据库中存在旧的 OKR、任务、复盘、示例业务数据  
   **When** 清理脚本确认执行  
   **Then** 旧业务数据被清空，后续导入从干净业务状态开始

**Edge Cases**:

- **US2-4** 清理前必须有备份或明确的恢复路径。
- **US2-5** 清理动作不能默认运行在开发库和生产库之间含糊不清的环境里，必须显示目标 database driver 和 database URL/schema。
- **US2-6** `audit_logs` 默认保留，除非后续明确决定重置审计历史。

### User Story 3 - Import 2026 Full-Year OKR (Priority: P1)

作为个人用户，我希望把 2026 年全年目标以 JSON 形式导入到 Stride OS 数据库，以便 OKR、任务和后续复盘都围绕真实年度目标运行。

**Why this priority**: 这是把系统从 Alpha 空壳推进到真实个人执行系统的核心数据初始化步骤。

**Acceptance Scenarios**:

1. **US3-1 Import full-year period**
   **Given** JSON 中定义 2026 全年周期  
   **When** 导入执行  
   **Then** 数据库中创建或复用 `2026` 年度周期，范围为 `2026-01-01` 到 `2026-12-31`

2. **US3-2 Import task lists**
   **Given** JSON 中包含公考、健康、副业、个人经营等清单  
   **When** 导入执行  
   **Then** 数据库中创建对应 user task lists，并保留系统 inbox

3. **US3-3 Import objectives and key results**
   **Given** JSON 中包含 Objective 和 KR  
   **When** 导入执行  
   **Then** Objective 和 KR 按顺序写入数据库，并能在 OKR 页面和 API 中查询

4. **US3-4 Avoid duplicate imports**
   **Given** 导入脚本已执行过一次  
   **When** 再次执行导入  
   **Then** 不重复创建同名周期、清单、Objective 或 KR，或者明确阻止重复导入

**Edge Cases**:

- **US3-5** 旧 `okr-2026-h1.json` 的 `period` 必须调整为 2026 全年，不再使用 H1 语义。
- **US3-6** JSON 中不被当前 DB 支持的字段，如 `refId`、`eventTags`、KR `description`，必须有明确处理方式：忽略、记录到导入映射、或等待后续 schema 扩展。
- **US3-7** 导入完成后必须能输出记录数量和关键 ID 映射，方便后续创建任务定义或 API 自动化。

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须统一 OKR period type/status 在 service、schema、migration 和 OpenAPI 中的枚举定义。
- **FR-002**: 系统必须支持以 `year` 周期表达 2026 全年 OKR，周期范围为 `2026-01-01` 至 `2026-12-31`。
- **FR-003**: 系统必须提供生产业务数据清理方案，清理 OKR、任务、复盘和示例业务数据。
- **FR-004**: 清理方案必须默认保留用户、session、API token、系统 inbox 清单和审计日志。
- **FR-005**: 清理方案必须支持 dry-run 或等价预览，展示将被影响的表和记录数量。
- **FR-006**: 导入方案必须支持从 JSON 直接写库创建任务清单、周期、Objective 和 KR。
- **FR-007**: 导入方案必须具备幂等或重复导入保护。
- **FR-008**: 导入完成后必须提供校验输出，包括周期数、清单数、Objective 数、KR 数和关键 refId 到数据库 ID 的映射。
- **FR-009**: 本阶段只产出 SDD 计划到 `tasks.md`，不执行生产清理、迁移或导入。

### Non-Functional Requirements

- **NFR-001**: 任何生产清理或导入执行前，必须显式展示目标数据库位置。
- **NFR-002**: 生产清理必须有备份前置步骤或明确恢复路径。
- **NFR-003**: 脚本和校验应同时兼容 SQLite 与 Postgres，或者明确标注只支持的数据库驱动。
- **NFR-004**: 数据清理和导入过程应尽量通过事务执行，避免半导入状态。

### Key Entities

- **Period**: OKR 周期，本次目标是 2026 全年周期。
- **TaskList**: 任务清单，承载公考、健康、副业、个人经营等目标域。
- **Objective**: 年度目标，属于 2026 周期。
- **KeyResult**: 目标下的可量化或里程碑结果。
- **ImportManifest**: 导入输入 JSON 和 refId/slug 到数据库 ID 的映射产物。

---

## Out of Scope

- 本阶段不实际执行生产数据库删除。
- 本阶段不实际导入 2026 OKR 数据。
- 本阶段不设计完整 OKR 内容文本，不重写每个 Objective 和 KR 的业务目标。
- 本阶段不新增复杂 UI。
- 本阶段不把 `eventTags`、KR `description` 等扩展字段强行塞入现有表，除非后续实现阶段决定补 schema。
- 本阶段不删除用户、认证、token、session 或审计数据。

---

## Unclear Questions

- 无阻塞问题。默认生产清理范围为业务数据表，保留认证和审计数据；2026 周期使用 `year` 类型。
