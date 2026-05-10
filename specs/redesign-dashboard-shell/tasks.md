# Tasks: 重塑 Dashboard 工作台视觉壳层

**Workspace**: `redesign-dashboard-shell` | **Date**: 2026-05-10  
**Input**: `specs/redesign-dashboard-shell/spec.md` + `plan.md`  
**Prerequisites**: spec.md (必须), plan.md (必须), data-model.md (不需要)

---

## 执行原则

- 先收口壳层和 token，再改页面骨架
- 先完成视觉锚点页，再扩散到其余页面
- 不改业务规则、不改服务层、不改路由职责
- 每个阶段都带局部验证，避免最后一次性返工

---

## Phase 1: Shell 与视觉基础

**目标**: 建立统一工作台 shell、视觉 token 和复用容器，为后续页面改造提供稳定底座。

- [x] T001 [US1][US2] 扩展全局视觉 token，建立“石墨底 + 金属面板 + 冷白细边 + 冰蓝强调”的基础变量体系
  - scope: `apps/web/src/app/globals.css`
  - verify: 局部检查变量命名、层级和现有页面兼容性；确认未破坏登录页和基础控件可读性

- [x] T002 [US1][US2] 重构 dashboard route group 的统一 shell，加入左侧主导航、顶部状态栏和主内容工作区
  - scope: `apps/web/src/app/(dashboard)/layout.tsx`
  - verify: 手动检查六个页面都进入同一壳层；导航链接可用；当前页有清晰定位反馈

- [x] T003 [US2][US5] 提炼共享 surface 容器和必要的 UI 原子样式，减少页面重复 className
  - scope: `apps/web/src/components/ui/index.ts`, `apps/web/src/components/ui/button.tsx`, `apps/web/src/components/ui/badge.tsx`, `apps/web/src/components/ui/modal.tsx`, 可选新增轻量容器组件
  - verify: 组件编译通过；按钮、面板、标题区、弹窗在新壳层下风格一致；不引入业务语义

---

## Phase 2: 视觉锚点页面

**目标**: 先完成 `dashboard` 和 `quadrants` 两个风格锚点页，验证整套视觉方向是否成立。

- [x] T004 [US3] 重组 `dashboard` 页面为“状态条 + 核心进展区 + 摘要区”，在不增接口的前提下提升总览扫描效率
  - scope: `apps/web/src/app/(dashboard)/dashboard/page.tsx`
  - verify: 手动检查总览、进展、摘要三层结构清晰；风险 KR、任务分布、最近复盘仍完整可见；空状态不塌

- [x] T005 [US4][US5] 重构 `quadrants` 页面为“中央象限盘 + 辅助详情区”，保留现有 dnd-kit 拖拽链路
  - scope: `apps/web/src/app/(dashboard)/quadrants/quadrants-client.tsx`
  - verify: 手动检查中央 2x2 区域成为主焦点；拖拽、错误回滚、键盘/点击替代操作仍可用；低数据量下布局稳

- [x] T006 [US2][US3][US4] 对照确认过的出图方向做一次视觉校准，修正锚点页中不符合“铝金属工作台”的局部样式
  - scope: `apps/web/src/app/(dashboard)/dashboard/page.tsx`, `apps/web/src/app/(dashboard)/quadrants/quadrants-client.tsx`, 相关共享 UI/样式文件
  - verify: 人工比对页面实际效果与已生成参考图；确认没有退回普通深色 SaaS 观感

---

## Phase 3: 其余页面骨架升级

**目标**: 将统一壳层和视觉系统扩展到 `okr / tasks / review / settings`，保证六页属于同一产品系统。

- [x] T007 [US3][US5] 重组 `okr` 页面为“目标列表区 + 当前目标详情区”的工作台布局
  - scope: `apps/web/src/app/(dashboard)/okr/page.tsx`, `apps/web/src/app/(dashboard)/okr/okr-client.tsx`
  - verify: 当前目标焦点明确；列表与详情分区清楚；原有 period/list/check-in 数据流不受影响

- [x] T008 [US3][US5] 重组 `tasks` 页面为“顶部过滤条 + 任务流 + 今日执行侧栏”的执行控制台布局
  - scope: `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`
  - verify: 今日/收件箱/已排期/已完成切换正常；新建/编辑任务 modal 仍可用；任务卡信息密度提升但不拥挤

- [x] T009 [US3][US5] 重组 `review` 页面为更安静的“总结 + 分析 + 下步行动”式布局
  - scope: `apps/web/src/app/(dashboard)/review/review-client.tsx`
  - verify: 生成草稿、保存草稿、归档定稿入口仍清晰；表单与历史记录层级更稳；文本可读性达标

- [x] T010 [US3][US5] 重组 `settings` 页面为分组控制台式布局，并保留账户与 API 令牌入口
  - scope: `apps/web/src/app/(dashboard)/settings/page.tsx`
  - verify: 账户信息和 token 管理入口易发现；简单页面不被过度装饰；分组层次清楚

---

## Phase 4: 一致性验证与收尾

**目标**: 完成全局一致性修正、静态检查和关键交互回归，确保视觉升级低风险交付。

- [x] T011 [US1][US2][US3][US5] 做六个页面的一致性巡检并修正偏差，包括导航高亮、标题区、面板边界、空状态、长页面滚动表现
  - scope: `apps/web/src/app/(dashboard)/**/*`, `apps/web/src/components/ui/*`, `apps/web/src/app/globals.css`
  - verify: 六页切换无明显割裂；长内容和空状态稳定；深色对比度达标

- [x] T012 [US5] 运行静态检查并做关键路径人工验收，记录仍需后续 feature 处理的问题
  - scope: `pnpm lint`, `pnpm typecheck`, 必要时补局部手测记录
  - verify: lint/typecheck 通过；关键交互回归完成；未解决问题被明确记录，不静默遗留

---

## 依赖与顺序

- `T001 -> T002 -> T003` 是基础关键路径，必须先完成。
- `T004` 和 `T005` 依赖 shell/token 基础完成，可顺序执行，建议先 `dashboard` 再 `quadrants`。
- `T006` 依赖 `T004`、`T005` 完成，用于锚点页视觉校准。
- `T007`、`T008`、`T009`、`T010` 依赖 `T001-T003`，建议按 `okr -> tasks -> review -> settings` 执行，但在实现资源允许时可部分并行。
- `T011`、`T012` 必须在所有页面改造完成后执行。

关键路径：

- `T001 -> T002 -> T003 -> T004 -> T005 -> T006 -> T011 -> T012`

---

## 覆盖检查

| 场景 / 需求 | 对应任务 |
|-------------|----------|
| US1 统一工作台壳层 | T001, T002, T011 |
| US2 铝金属工作台视觉语言 | T001, T003, T006, T011 |
| US3 六页布局骨架与扫描效率 | T004, T007, T008, T009, T010, T011 |
| US4 四象限最高辨识度 | T005, T006, T011 |
| US5 低风险升级与回归控制 | T003, T005, T007, T008, T009, T010, T012 |

---

## Notes

- 若实现过程中发现当前共享 UI 原子层不足以支撑页面复用，可在 `T003` 内补少量轻量容器组件，但不要把这一步膨胀成完整设计系统重构。
- 若 `dashboard` 或 `quadrants` 的视觉锚点效果未达预期，不应继续批量推进其余页面，先在 `T006` 收敛。
- 本任务清单已足够进入实现，下一步建议直接 `implement`；若希望我按阶段自动推进，则用 `execute-plan`。
