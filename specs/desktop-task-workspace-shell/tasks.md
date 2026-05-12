# Tasks: 桌面高密度任务工作台与全局壳层重构

**Workspace**: `desktop-task-workspace-shell` | **Date**: 2026-05-12  
**Input**: `specs/desktop-task-workspace-shell/spec.md` + `plan.md`  
**Prerequisites**: spec.md (必须), plan.md (必须), data-model.md (不需要)

---

## 执行原则

- 先改共享壳层，再改任务页，避免页面局部布局建立在旧 shell 之上
- 任务页优先解决结构和空间分配，再压缩任务行密度
- 尽量复用现有 actions、数据聚合和业务状态，不在本轮重构业务模型
- 每个阶段都保留最小可验证结果，避免最后一次性合并过多布局变化

---

## Phase 1: 全局高密度壳层

**目标**: 让 dashboard 共享骨架从品牌化内容栏收紧为桌面工具型壳层，并保证其他页面可继续复用。

- [x] T001 [US1] 收紧 dashboard 外层容器与主内容区留白
  - scope: `apps/web/src/app/(dashboard)/layout.tsx`, `apps/web/src/app/globals.css`
  - verify: 打开任一 dashboard 页面，确认外层 padding、壳层包裹感和主区内边距明显缩小，主内容仍独立滚动

- [x] T002 [US1][US5] 将左侧全局导航改造成高密度工具栏
  - scope: `apps/web/src/app/(dashboard)/dashboard-shell-sidebar.tsx`
  - verify: 展开态去除品牌说明、用户卡片和重复退出入口；收起态仍可识别当前页面并正常切换路由

- [x] T003 [US1][US5] 校准共享壳层样式 token 与面板层级，避免其他 dashboard 页面明显破版
  - scope: `apps/web/src/app/globals.css`, 必要时少量触达依赖共享壳层的 dashboard 页面
  - verify: 至少检查 `/dashboard` 与 `/settings`，确认新 shell 下结构稳定、导航高亮正常、无明显视觉塌陷

---

## Phase 2: 任务页骨架重构

**目标**: 把任务页从介绍式三栏页面改成操作优先的工作台骨架。

- [x] T004 [US2] 移除任务页 `PageIntro`，把关键操作收敛到工作台内工具条
  - scope: `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`
  - verify: 任务页首屏不再出现介绍型标题区；当前来源标题和新建任务入口仍清晰可见

- [x] T005 [US2] 将任务页主布局改为“来源栏 + 主列表”的默认两栏结构
  - scope: `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`
  - verify: 未选中任务时不再渲染常驻详情列；来源栏和主列表宽度分配符合“主列表最大化”目标

- [x] T006 [US2] 收紧来源栏密度并保留智能来源/真实清单切换能力
  - scope: `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`
  - verify: 来源栏仍能切换智能来源与清单，数量和新建清单入口保留，但垂直与横向占用明显缩小

---

## Phase 3: 条件详情面板联动

**目标**: 让任务详情从常驻空列改为按需展开的右侧上下文面板。

- [x] T007 [US3] 基于 `selectedTaskId` 实现详情面板条件渲染与主列表宽度回流
  - scope: `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`
  - verify: 选中任务后详情面板展开；取消选中或切换到失效来源后详情收起，主列表同步扩宽

- [x] T008 [US3] 完善详情面板的关闭路径、空描述文案和上下文失效处理
  - scope: `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`
  - verify: 详情可显式关闭；任务无描述时布局稳定；切换来源导致选中任务失效时不会残留旧详情

- [x] T009 [US3] 校准任务页各 pane 的独立滚动与吸顶工具条行为
  - scope: `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`, 必要时 `apps/web/src/app/globals.css`
  - verify: 来源栏、主列表、详情面板在长内容场景下滚动行为稳定，不会拖动整个页面结构

---

## Phase 4: 紧凑任务行与视觉密度优化

**目标**: 把任务项从大卡片压缩成更接近 Things / 滴答的高密度行式列表。

- [x] T010 [US4] 将任务项从卡片式 `article` 改造成紧凑行式结构
  - scope: `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`
  - verify: 一屏可见任务数明显增加；任务行仍包含 checkbox、标题、必要标签和日期

- [x] T011 [US4] 重排任务行的标签、日期、编辑入口与完成态视觉
  - scope: `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`, 必要时复用 `apps/web/src/components/ui/badge.tsx`
  - verify: 智能来源视图下清单标识仍清晰；已完成任务弱化但可读；编辑入口不再挤占主体扫描区域

- [x] T012 [US4] 校验紧凑行中的点击区域语义不回退
  - scope: `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`
  - verify: checkbox 继续只负责完成切换；点击任务主体继续只负责选中与详情联动；不会互相误触

---

## Phase 5: 验证与收尾

**目标**: 用最小但完整的验证确认这次壳层重构可交付。

- [x] T013 [US1][US2][US3][US4][US5] 运行静态校验并修复重构引入的问题
  - scope: `pnpm lint`, `pnpm typecheck`, 必要时 `pnpm test`
  - verify: 命令通过，或明确记录剩余失败项与是否为本次改动引入

- [ ] T014 [US1][US2][US3][US4][US5] 完成桌面端手动验收并记录结果
  - scope: `/tasks`, `/dashboard`, `/settings`
  - verify: 确认壳层收紧、导航收展、默认两栏、条件详情、紧凑任务行和跨页壳层复用全部成立

---

## 依赖与顺序

- `T001 -> T002 -> T003` 是共享壳层关键路径，必须先完成
- `T004 -> T005 -> T006` 依赖新的壳层空间分配，属于任务页骨架关键路径
- `T007 -> T008 -> T009` 依赖新的任务页骨架
- `T010 -> T011 -> T012` 依赖主列表骨架稳定后再做密度优化
- `T013 -> T014` 必须最后执行

可相对独立的部分：

- `T003` 与 `T006` 可在主路径稳定后交叉微调
- `T011` 与 `T012` 可在 `T010` 完成后连续处理

---

## 覆盖检查

| 场景 / 需求 | 对应任务 |
|-------------|----------|
| US1 全局高密度壳层 | T001, T002, T003 |
| US2 任务页默认最大操作空间 | T004, T005, T006 |
| US3 条件详情面板 | T007, T008, T009 |
| US4 紧凑任务行 | T010, T011, T012 |
| US5 可复用桌面工作台逻辑 | T002, T003, T014 |

---

## Notes

- 当前任务拆解默认不重构任务业务 actions、service 和数据模型；如果实现过程中发现 UI 目标被现有数据边界阻塞，再回退更新 `plan.md`
- 若 `tasks-client.tsx` 在实现阶段过于臃肿，可在不改变服务端聚合边界的前提下抽出局部视图组件
