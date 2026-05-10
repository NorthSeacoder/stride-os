# Acceptance: 优化任务创建与四象限交互

**Workspace**: `improve-task-interactions` | **Date**: 2026-05-09

---

## Automated Verification

- `pnpm test` passed
- `pnpm typecheck` passed
- `pnpm lint` passed

## Implemented Scope

- 新增 Base UI wrappers：Modal、表单控件、DatePickerField、反馈组件
- 日期组件使用 Base UI 外壳 + `react-day-picker` 日期核心
- 修复任务 KR 关联事务返回 Promise 的创建阻断问题
- 任务创建/编辑改为 modal，不再在页面正文插入表单
- 任务页日期字段和收件箱快速排期改为统一日期选择组件
- 四象限改为 dnd-kit 拖拽，保留选择框替代操作，失败可回退并展示错误
- dashboard 新增今日负载和任务状态分布图
- dashboard/tasks/quadrants 触达区域卡片圆角已收紧

## Manual Browser Checks

待浏览器环境确认：

- `/tasks`: 新建任务 modal 打开/关闭、最小创建、编辑任务、错误保留、日期选择与清空
- `/tasks`: 收件箱快速排期能选择日期并移动到已排期
- `/quadrants`: 任务可拖到其他象限，刷新后位置保留；失败时位置回退
- `/quadrants`: 不使用拖拽时可通过“移动到”选择框调整象限
- `/dashboard`: 图表空态和非空态渲染正常，卡片圆角风格一致

## Known Follow-Up

- 全站 Base UI 迁移不在本 feature 范围内，后续单独开 feature。
