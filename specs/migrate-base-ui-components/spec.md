# Feature Specification: Migrate Base UI Components

**Workspace**: `stride-os`  
**Created**: 2026-05-10  
**Status**: Draft  
**Input**: 用户描述: "现在想要把所有组件都改成 base ui 为基础的,改如何下手呢"

---

## Background & Goal

Stride OS 已安装 `@base-ui/react`，并且 `apps/web/src/components/ui` 中已有 Toast、Modal、DatePicker、部分表单控件基于 Base UI。与此同时，多个页面仍直接使用原生 `button`、`input`、`select`、`textarea` 并重复书写样式。

本功能目标是把项目内所有可见交互控件统一到 Base UI 基础之上，形成一致的无障碍行为、键盘交互、状态表达和视觉接口，减少页面内重复控件代码。展示类组件不强行 Base UI 化，但应统一为项目自有 display components，并复用同一主题变量、尺寸和状态语义。

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 统一交互控件基础 (Priority: P1)

作为使用 Stride OS 的用户，我希望表单、弹窗、通知、选择器、按钮等交互控件在各页面行为一致，以便我在任务、OKR、复盘、设置等工作流中获得稳定体验。

**Why this priority**: 当前已有部分 Base UI 控件，但页面中仍有大量原生控件和重复样式，最容易产生交互差异和维护成本。

**Acceptance Scenarios**:

1. **[US1-1] 基础交互保持可用**
   **Given** 用户进入任务、OKR、复盘或设置页面  
   **When** 用户打开弹窗、填写表单、选择选项、提交操作  
   **Then** 原有业务流程仍能完成，控件行为一致且没有明显视觉回退

2. **[US1-2] 键盘和焦点行为一致**
   **Given** 用户只使用键盘导航页面  
   **When** 用户在按钮、输入框、选择器、弹窗之间移动焦点并操作  
   **Then** 焦点可见，交互顺序合理，弹窗和浮层符合预期键盘行为

3. **[US1-3] 展示组件保持一致语义**
   **Given** 页面展示空状态、加载状态、错误提示、状态标签或分组面板  
   **When** 用户在不同业务页面之间切换  
   **Then** 展示组件的密度、状态语义、尺寸和主题变量保持一致，但不要求基于 Base UI primitive

**Edge Cases**:

- **[US1-4]** 表单校验失败时，错误提示仍与对应字段关联并可被用户识别。
- **[US1-5]** 提交中、禁用、危险操作、空数据等状态必须保留原有语义和样式区分。
- **[US1-6]** 隐藏字段、服务端 action 所需字段不得因迁移丢失。

### User Story 2 - 建立可复用 UI 入口 (Priority: P2)

作为开发者，我希望常用控件有统一导出入口和稳定 props 约定，以便新增页面时优先复用项目控件，而不是在页面中继续手写原生控件样式。

**Why this priority**: 迁移不仅是替换现有代码，还要防止后续继续分散实现。

**Acceptance Scenarios**:

1. **[US2-1] 页面复用统一控件**
   **Given** 开发者查看 app 页面代码  
   **When** 页面需要按钮、文本输入、文本域、单选选择、复选框、弹窗、通知或日期选择  
   **Then** 页面应优先从项目 UI 入口复用控件

2. **[US2-2] 控件 API 支持现有用例**
   **Given** 现有页面包含服务端 action 表单、客户端状态表单和弹窗表单  
   **When** 控件迁移完成  
   **Then** 这些用例不需要业务层绕过统一控件才能正常工作

**Edge Cases**:

- **[US2-3]** 原生 HTML 控件仅在 Base UI 不提供对应能力、或隐藏字段等无视觉交互场景保留。
- **[US2-4]** 首轮迁移要求替换所有可见原生 `button`、`input`、`select`、`textarea`；隐藏字段可保留原生 `input type="hidden"`。

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须以 Base UI 作为所有可见交互 UI primitive 的默认基础，包括但不限于 Button、Dialog、Toast、Field、Checkbox、Select、Popover 等已有使用范围。
- **FR-002**: 系统必须保留现有任务、OKR、复盘、示例、设置、登录等页面的业务能力和表单提交语义。
- **FR-003**: 系统必须减少页面中重复的原生交互控件样式，常用控件应通过项目 UI 入口复用。
- **FR-004**: 系统必须保持现有视觉主题变量和深色界面风格，不因迁移引入不一致的默认浏览器样式。
- **FR-005**: 系统必须保持或改善可访问性，包括 label、description、error、focus、disabled、keyboard navigation、dialog focus management。
- **FR-006**: 系统必须替换所有可见原生 `button`、`input`、`select`、`textarea` 调用点；`input type="hidden"` 可保留以维持服务端 action 表单语义。
- **FR-007**: 系统必须覆盖现有导出入口 `apps/web/src/components/ui/index.ts`，避免迁移后出现多个互相竞争的 UI 入口。
- **FR-008**: 系统必须继续使用 `apps/web/src/components/ui` 作为首轮统一 UI 入口，不在本轮迁移到 `packages/ui`。
- **FR-009**: 系统必须把 Empty、Loading、ErrorAlert、FeedbackAlert、Badge、StatusPill、Panel、Toolbar、SectionHeader 等展示类能力视为项目 display components，不要求基于 Base UI，但必须共享主题变量、尺寸、状态语义和导出入口。

### Non-Functional Requirements

- **NFR-001**: 迁移后 `pnpm lint`、`pnpm typecheck`、`pnpm test` 应通过。
- **NFR-002**: 迁移不得显著增加页面客户端边界；只有需要浏览器状态或 Base UI 交互行为的控件使用 client component。
- **NFR-003**: 迁移后的控件 props 应尽量兼容现有 HTML 表单属性，降低业务页面改动成本。
- **NFR-004**: 页面布局不得因控件替换出现文字溢出、按钮尺寸跳动、弹窗遮挡或浮层定位异常。

### Key Entities

- **UI Primitive**: Base UI 提供的无样式交互基础组件，如 Dialog、Select、Field、Checkbox、Popover、Toast。
- **Project UI Component**: Stride OS 封装并对业务页面暴露的控件，如 Modal、TextField、SelectField、CheckboxField、DatePickerField、ToastProvider。
- **Display Component**: 不承担复杂交互行为、主要负责信息呈现和视觉语义的项目组件，如 Empty、Loading、ErrorAlert、FeedbackAlert、Badge、StatusPill、Panel、Toolbar、SectionHeader。
- **Business Page**: `apps/web/src/app` 下的任务、OKR、复盘、示例、设置、登录等用户界面。

---

## Out of Scope

- 不重设计整套视觉语言或主题 token。
- 不引入新的 UI 框架替代 Base UI。
- 不修改业务数据模型、服务端 action 或数据库结构，除非为了保持表单提交兼容必须做极小适配。
- 不把非交互展示组件强行改写为 Base UI primitive。
- 不在首轮把 UI 组件迁移到 `packages/ui` 共享包。
- 不迁移第三方复杂组件本身，除非它们包裹在项目 UI 控件中且影响一致性。

---

## Unclear Questions

无。
