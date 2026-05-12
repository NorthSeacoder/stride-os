# Tasks: 重塑 Dashboard 工作台视觉壳层

**Workspace**: `redesign-dashboard-shell` | **Date**: 2026-05-11  
**Input**: `specs/redesign-dashboard-shell/spec.md` + `plan.md`  
**Prerequisites**: spec.md (必须), plan.md (必须), data-model.md (不需要)

---

## 执行原则

- 先建立 `shadcn` 管理入口和壳层边界，再推进页面替换
- 先打通共享基座（shell / date / form / chart），再做页面消费
- dashboard、tasks、review、settings 是本轮核心路径；okr、quadrants 只做必要接入
- 每个阶段都带局部验证，避免最后一次性集成返工

---

## Phase 1: 实施前置与共享壳层

**目标**: 建立 `shadcn` 管理入口、收口 dashboard shell，并为后续组件替换准备稳定骨架。

- [x] T001 [US5][US8] 建立项目级 `shadcn` 管理入口与最小配置，确认组件继续落在 `apps/web/src/components/ui`
  - scope: `apps/web/components.json` 或等效配置、项目级 skill 安装前置说明、`apps/web/src/components/ui` 目录组织
  - verify: 能明确后续 `shadcn add` 的落点与管理方式；不误接到 `packages/ui`

- [x] T002 [US1][US4][US8] 重构 dashboard route group shell，移除重复顶部信息，把当前用户与退出操作收敛到侧边栏稳定控制区
  - scope: `apps/web/src/app/(dashboard)/layout.tsx`, `apps/web/src/app/(dashboard)/dashboard-shell-nav.tsx`
  - verify: 六个 dashboard 页面共享同一壳层；用户信息/登出仅保留一处主控制区；当前页导航反馈正常

- [x] T003 [US1][US4][US8] 修正主内容滚动边界，确保 `main` 独立滚动、sidebar 不随长页面内容失位
  - scope: `apps/web/src/app/(dashboard)/layout.tsx`, `apps/web/src/app/globals.css`
  - verify: 长内容页面滚动时 sidebar 稳定；短内容和空页面不塌陷；窄宽度下壳层仍可用

- [x] T004 [US2][US8] 收敛全局视觉 token 与 Tailwind 变量类名写法规范，建立共享 surface 使用约定
  - scope: `apps/web/src/app/globals.css`, `apps/web/src/components/ui/*`
  - verify: 当前触达文件中的 `text-[var(--...)]` 等写法按约定规整；登录页与基础控件可读性不回退

---

## Phase 2: 共享组件基座

**目标**: 用 `shadcn` 管理的共享组件层替换当前私有 date / chart / form 基座，并保持与现有 Base UI 和 React 19 action 流程兼容。

- [x] T005 [US5][US8] 重组共享 UI 层导出与来源规则，明确哪些组件由 `shadcn` 管理、哪些继续以 Base UI wrapper 形式保留
  - scope: `apps/web/src/components/ui/index.ts`, `apps/web/src/components/ui/surfaces.tsx`, `apps/web/src/components/ui/button.tsx`, `apps/web/src/components/ui/form-controls.tsx`
  - verify: 共享 UI 出口清晰；不再继续扩大页面私有基础组件；现有页面编译关系不被破坏

- [x] T006 [US5][US8] 以 `shadcn` 管理的 calendar/date-picker 重建日期输入基座，并保持 `YYYY-MM-DD` 提交契约
  - scope: `apps/web/src/components/ui/date-picker-field.tsx`, 可选新增 `apps/web/src/components/ui/calendar.tsx`
  - verify: 任务与复盘场景可继续提交正确日期；清空、默认值、空态与可读性正常

- [x] T007 [US5][US8] 为复杂客户端表单建立 `@tanstack/react-form` 接入基座，并定义与 `useActionState` 共存的提交桥接模式
  - scope: 可选新增 `apps/web/src/components/ui/form.tsx`, `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`, `apps/web/src/app/(dashboard)/review/review-client.tsx`
  - verify: 至少一个复杂表单场景可用新基座承接字段状态；server action 提交流程不回退

- [x] T008 [US5][US6][US8] 引入统一 chart 组件基座，替换页面私有图形表达所需的共享容器、配色与空态规则
  - scope: 可选新增 `apps/web/src/components/ui/chart.tsx`, `apps/web/src/components/ui/index.ts`
  - verify: chart 基座能承接 dashboard 统计图；空数据和小数据场景有统一输出

---

## Phase 3: Dashboard 与核心页面接入

**目标**: 优先完成 dashboard 图表化与 settings / tasks / review 三个高价值页面，验证壳层与组件治理路线。

- [x] T009 [US3][US6][US8] 重构 `dashboard` 页面，收敛任务状态分布、今日执行负载、风险/闭环摘要为统一图表与摘要组件
  - scope: `apps/web/src/app/(dashboard)/dashboard/page.tsx`, `apps/web/src/lib/services/review-service.ts`
  - verify: 三类统计表达统一；数值与图表一致；零数据空态稳定；关键指标仍可直读

- [x] T010 [US3][US5][US8] 选定 `tasks` 作为复杂表单与 date picker 首个试点，替换新建/编辑任务中的日期与字段状态管理
  - scope: `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`, `apps/web/src/app/(dashboard)/tasks/actions.ts`
  - verify: 新建、编辑、排期、状态切换正常；日期选择体验升级；表单错误与提交状态不回退

- [x] T011 [US3][US5][US8] 选定 `review` 作为第二个复杂表单试点，升级日期范围选择与草稿编辑表单容器
  - scope: `apps/web/src/app/(dashboard)/review/review-client.tsx`, `apps/web/src/app/(dashboard)/review/actions.ts`
  - verify: 生成草稿、保存草稿、日期范围输入正常；复杂字段状态与错误提示更稳定

- [x] T012 [US4][US8] 重构 `settings` 分组控制台，确保首页与子页只展示当前分组内容，并明确“偏好”禁用/占位状态
  - scope: `apps/web/src/app/(dashboard)/settings/page.tsx`, `apps/web/src/app/(dashboard)/settings/settings-nav.tsx`, `apps/web/src/app/(dashboard)/settings/tokens/tokens-client.tsx`
  - verify: `/settings` 与 `/settings/tokens` 导航状态严格一致；账户页不污染 tokens 页；偏好不再伪装成可点击入口

---

## Phase 4: 其余页面接入与一致性收尾

**目标**: 将统一壳层和新组件系统扩展到其余 workspace，并完成收尾验证。

- [x] T013 [US3][US8] 对 `okr` 页面做必要接入改造，使其消费新壳层与共享 surface/date 基座，但不扩大到业务重构
  - scope: `apps/web/src/app/(dashboard)/okr/okr-client.tsx`, `apps/web/src/app/(dashboard)/okr/page.tsx`
  - verify: 当前目标工作台布局保持清晰；现有创建 period/objective/KR/check-in 链路不受影响

- [x] T014 [US7][US8] 对 `quadrants` 页面做必要接入改造，使其适配新 shell 与共享视觉规则，同时保留 dnd-kit 交互链路
  - scope: `apps/web/src/app/(dashboard)/quadrants/quadrants-client.tsx`
  - verify: 中央象限盘仍为主焦点；拖拽、错误回滚、低数据量空态稳定

- [x] T015 [US1][US2][US3][US5][US6][US8] 做全局一致性巡检，修正六页在 shell、surface、date、form、chart、Tailwind 写法上的偏差
  - scope: `apps/web/src/app/(dashboard)/**/*`, `apps/web/src/components/ui/*`, `apps/web/src/app/globals.css`
  - verify: 六页切换无明显割裂；共享组件使用方式稳定；样式规范不再明显回流

- [x] T016 [US8] 运行静态检查并完成关键路径人工验收，记录仍需后续 feature 处理的遗留项
  - scope: `pnpm lint`, `pnpm typecheck`, 必要时补手测记录
  - verify: lint/typecheck 通过；dashboard/tasks/review/settings 核心路径手测完成；遗留项被明确记录

---

## 依赖与顺序

- `T001 -> T002 -> T003 -> T004` 是共享前置，必须先完成。
- `T005 -> T006 -> T007 -> T008` 是组件基座关键路径；其中 `T007`、`T008` 依赖 `T005`，`T006` 可与 `T007` 部分并行。
- `T009` 依赖 `T008`；`T010`、`T011` 依赖 `T006`，且复杂表单升级建议在 `T007` 后执行。
- `T012` 依赖 `T002`、`T003`，可与 `T009-T011` 并行。
- `T013`、`T014` 放在核心页面验证后再推进，避免过早扩散。
- `T015`、`T016` 必须在所有实现任务完成后执行。

关键路径：

- `T001 -> T002 -> T003 -> T004 -> T005 -> T006 -> T007 -> T008 -> T009 -> T010 -> T011 -> T015 -> T016`

---

## 覆盖检查

| 场景 / 需求 | 对应任务 |
|-------------|----------|
| US1 统一高可用壳层 | T002, T003, T015 |
| US2 铝金属工作台视觉语言 | T004, T005, T015 |
| US3 六页布局骨架与扫描效率 | T009, T010, T011, T012, T013, T014, T015 |
| US4 设置页导航与账户控制 | T002, T012, T015 |
| US5 `shadcn` + Base UI 组件治理 | T001, T005, T006, T007, T008 |
| US6 Dashboard 图表统一 | T008, T009, T015 |
| US7 四象限最高辨识度 | T014, T015 |
| US8 低风险升级与样式治理 | T004, T007, T015, T016 |

---

## Notes

- 旧 `tasks.md` 属于上一轮“纯视觉壳层改造”拆解，且状态已全部完成；本次已按新 `spec/plan` 重写，不应复用旧完成状态。
- `pnpm dlx skills add shadcn/ui` 属于实施前置动作，建议在 `T001` 内决定并记录是否执行。
- 若 `shadcn` 生成物与现有 Base UI wrapper 发生明显结构冲突，应先在 `T005` 收口规则，再继续页面接入。
- 当前任务清单已足够进入实现；下一步建议直接 `implement`，或者用 `execute-plan` 按阶段推进。
- `T016` 本轮以核心路径静态检查、构建验证与代码级巡检收口：已确认 `dashboard/tasks/review/settings/okr/quadrants` 主路径中旧式 `text-[var(--...)]` / `border-[var(--...)]` 写法已清理，`pnpm typecheck`、`pnpm lint` 与 `pnpm --filter @stride-os/web build` 通过；浏览器运行态手测仍建议在下轮补完一次交互回归，尤其关注 task/review 表单提交与 quadrants 拖拽。
