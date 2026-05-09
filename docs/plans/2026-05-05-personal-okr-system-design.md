# Personal OKR System Design

## Goal

设计并实现一套只服务个人、可自部署到 NAS、并对 Hermes 友好的 OKR 执行系统。

这不是一个“薄应用”或“只是任务清单外壳”，而是一个完整的个人执行产品，目标覆盖：

- OKR 设定、跟踪、check-in、复盘
- 待办清单、日历视图、四象限视图
- 待办和 KR 的直接关联
- 周 / 月复盘与趋势分析
- Hermes 直接查询和写入

## Problem

当前 `note/` 仓库里已经有一套可机读但不够易用的目标管理结构：

- `07-个人目标/*个人OKR.md`：承载 Objective / KR 的 frontmatter 和人读正文
- `07-个人目标/*任务清单.md`：承载拆解后的 checklist
- `14-协议/事件-KR映射.md`：承载事件标签到 KR 的映射
- `DailyTasks/**/*.md`：承载日常事件与情绪
- `period-digest`：基于 daily frontmatter 聚合周 / 月复盘

这套结构已经能支持 Hermes 做“读取、聚合、生成复盘”，但有四个明显问题：

1. OKR、任务、复盘分散在多个 markdown 文件，人工浏览和筛选成本高
2. KR 进度主要依赖 `topics` 命中估算，不是围绕“真实任务完成”和“实际指标更新”
3. 缺少日历、四象限、按 KR 查看任务等高频操作视图
4. Hermes 当前面对的是 markdown 真源，不是实体化 API，读写成本高

## Product Positioning

产品定位为：

`Single-user, agent-native, self-hosted personal OKR operating system`

约束很明确：

- 只服务本人
- 默认只有本人和 Hermes 使用
- 不做多人协作、组织层级、审批流、复杂权限
- 不以“团队 OKR 软件”作为目标

这意味着系统应优先优化：

- 个人日常使用效率
- Hermes 自动化读写
- 复盘和趋势回流
- 数据模型的长期可演进性

## Scope

### In Scope

- 周期管理：季度 / 半年 / 年度
- Objective / KR 管理
- KR check-in
- KR 进度可视化
- 待办系统
- 四象限视图
- 日历视图
- 复盘系统
- Hermes API
- 从现有 markdown 导入数据

### Out of Scope

- 多用户和团队协作
- 企业级权限控制
- 复杂通知体系
- 移动端原生 App
- 外部公开分享页
- 与飞书 / Notion / Google Calendar 的双向同步

## Core Requirements

### 1. OKR

系统必须支持：

- 创建周期
- 创建 Objective
- 为 Objective 创建多个 KR
- KR 支持 baseline、target、unit、status、confidence、notes
- KR 支持定期 check-in
- KR 支持关联任务和复盘记录
- 支持周期归档和历史查看

### 2. Tasks

系统必须支持：

- Inbox
- Today
- Next
- Scheduled
- Someday
- Waiting
- Recurring
- 子任务
- 标签、优先级、预计时间
- 待办关联 `kr_id`
- 待办支持拖拽改状态

### 3. Views

系统必须支持：

- 列表视图
- 日历视图
- 四象限视图
- 按 KR 查看任务
- 按周期查看 KR 进度
- Today 聚合页

### 4. Review

系统必须支持：

- 周复盘
- 月复盘
- 周期复盘
- mood / energy 趋势
- KR check-in 历史
- 完成率和延期趋势

### 5. Agent Integration

Hermes 必须能直接：

- 查询当前周期 OKR
- 查询某个 KR 的进度
- 查询 Today / Inbox / Scheduled 任务
- 新增待办
- 更新待办状态
- 将待办关联到 KR
- 新增 KR check-in
- 生成周复盘草稿

## Design Principles

### 1. Agent Native

系统不是“先做给人，再顺带给 agent 接口”。

相反，系统从第一天起就应把人和 Hermes 都视为一等客户端：

- UI 面向人类操作
- OpenAPI 面向 Hermes 调用
- 后台任务负责自动聚合、提醒、复盘素材整理

### 2. One Source of Truth

迁移完成后，产品数据库成为结构化真源。

现有 markdown 的角色调整为：

- 导入源
- 归档导出
- 可选镜像

不再继续让 markdown 充当主业务数据库。

### 3. Stable but Modern

技术选型优先“稳定面上的新技术”，而不是“旧但保守”。

原则：

- 优先选已稳定的新主线版本
- 优先单语言、强类型、schema-first
- 优先减少基础设施数量
- 优先 NAS 可部署、可维护

### 4. Single-User First

所有流程先围绕“一个人每天用起来顺手”设计。

这意味着：

- 页面和模型不必被组织级概念污染
- 不为未来假设的多用户需求牺牲 v1 清晰度
- 真正需要多用户时再演进

## Product Modules

### Dashboard

首页承载：

- 当前周期 OKR 摘要
- Today 任务
- Inbox 任务
- 本周 KR 风险项
- 最近一次复盘摘要
- 今日 mood / energy quick log

### OKR

OKR 模块承载：

- 周期列表
- Objective / KR 编辑
- KR check-in
- KR 历史曲线
- KR 关联任务列表
- KR 关联复盘片段

### Tasks

Tasks 模块承载：

- 任务列表
- 任务详情
- 子任务
- 关联 KR
- 标签
- 优先级
- 预计时长
- 状态流转

### Calendar

Calendar 模块承载：

- 月视图
- 周视图
- 拖拽改期
- Scheduled task 浏览
- 根据 KR / 标签筛选

### Quadrants

四象限模块按：

- Important + Urgent
- Important + Not Urgent
- Not Important + Urgent
- Not Important + Not Urgent

展示任务，并允许快速调整。

### Review

Review 模块承载：

- 周复盘
- 月复盘
- 周期复盘
- 自动草稿
- 手动补充
- KR 进度回看

### Settings / Tokens

承载：

- Hermes API token
- 导入 / 导出
- 默认周期设置
- 默认视图设置

## Data Model

### Core Entities

#### periods

- `id`
- `name`
- `type` (`quarter` / `half` / `year`)
- `start_date`
- `end_date`
- `status`

#### objectives

- `id`
- `period_id`
- `title`
- `description`
- `status`
- `position`

#### key_results

- `id`
- `objective_id`
- `title`
- `metric_type`
- `baseline_value`
- `target_value`
- `current_value`
- `unit`
- `status`
- `confidence`
- `start_date`
- `due_date`
- `notes`

#### kr_check_ins

- `id`
- `kr_id`
- `check_in_date`
- `status`
- `confidence`
- `current_value`
- `summary`
- `blockers`

#### tasks

- `id`
- `title`
- `description`
- `status`
- `priority`
- `importance`
- `urgency`
- `scheduled_date`
- `due_date`
- `estimated_minutes`
- `completed_at`
- `parent_task_id`

#### task_kr_links

- `task_id`
- `kr_id`

#### reviews

- `id`
- `period_type` (`week` / `month` / `cycle`)
- `period_key`
- `status`
- `summary`
- `wins`
- `lessons`
- `blockers`

#### review_kr_snapshots

- `review_id`
- `kr_id`
- `status`
- `progress_value`
- `notes`

#### daily_logs

- `id`
- `log_date`
- `mood`
- `mood_tag`
- `energy`
- `notes`

### Optional v1.1 Entities

- `tags`
- `task_tags`
- `attachments`
- `event_ingestions`
- `agent_actions`

## Progress Engine

KR 进度不能只靠一个维度。

系统应支持三类 KR：

### 1. Numeric KR

例如：

- 发布 12 篇文章
- 完成 35 个有效学习日

进度 = `current_value / target_value`

### 2. Milestone KR

例如：

- 社保开户完成
- 简历站上线

进度 = 基于状态机：

- `not_started`
- `in_progress`
- `at_risk`
- `done`

### 3. Hybrid KR

例如：

- 体重降到某区间，并输出替代训练方案

进度 = 数值部分 + 里程碑部分的加权结果

v1 需要允许手动 check-in 覆盖自动计算结果，避免机械误判。

## Hermes API

API 采用 OpenAPI 设计，至少包含这些接口：

### OKR

- `GET /api/agent/periods/current`
- `GET /api/agent/objectives`
- `GET /api/agent/key-results`
- `GET /api/agent/key-results/:id`
- `POST /api/agent/key-results/:id/check-ins`

### Tasks

- `GET /api/agent/tasks`
- `GET /api/agent/tasks/today`
- `GET /api/agent/tasks/inbox`
- `POST /api/agent/tasks`
- `PATCH /api/agent/tasks/:id`
- `POST /api/agent/tasks/:id/link-kr`

### Review

- `GET /api/agent/reviews/latest`
- `POST /api/agent/reviews/generate-weekly-draft`
- `POST /api/agent/reviews/generate-monthly-draft`

### Utility

- `GET /api/agent/health`
- `GET /api/agent/schema`

认证采用：

- Personal access token
- 单用户固定 owner

## NAS Environment Constraints

截至 2026-05-05，NAS 已确认存在这些相关基础设施：

- 共享 `MySQL 8.4.5`
- 共享 `Redis 8.0.2`
- `Traefik v3.6.13`
- `Hermes`
- `n8n`
- `Umami` 自带 `Postgres 17`

基于现状，设计上有三个约束：

### 1. 复用 Traefik，不再引入新的反向代理

新应用应直接接入现有 `Traefik` 网络和路由体系。

### 2. 不复用 Umami 的 Postgres

`Umami` 的 Postgres 是应用私有数据库，不适合作为共享业务库。

### 3. v1 尽量不引入 Redis 依赖

尽管 NAS 上已有 Redis，但 v1 应尽量减少对额外基础设施的绑定。

如果可行，优先采用基于 Postgres 的后台任务方案。

## Technical Stack

### Final Recommendation

- `Node.js 22 LTS`
- `Next.js 15`
- `React 19`
- `TypeScript`
- `PostgreSQL 17`
- `Drizzle ORM`
- `Zod`
- `OpenAPI`
- `TanStack Query v5`
- `Tailwind CSS v4`
- `shadcn/ui`
- `FullCalendar`
- `dnd-kit`
- `pg-boss`
- `Vitest`
- `Playwright`
- `Docker Compose`
- `Traefik`

### Why This Stack

#### Next.js 15 + React 19

足够新，同时已经是稳定主线。

适合：

- 表单密集页面
- Server Actions
- 单体部署
- 和 agent 协作开发

#### PostgreSQL 17

虽然 NAS 上已有 MySQL，但本系统更适合 Postgres：

- 对复杂关系模型更友好
- 对统计、时间序列、全文检索更友好
- 更适合未来的 review / analytics / event log 扩展

#### Drizzle

原因：

- schema 明确
- TS 类型直出
- 对 agent 生成和维护代码更友好
- 对迁移管理足够清晰

#### OpenAPI

不采用 `tRPC-only`。

因为 Hermes 是外部 agent 客户端，不是前端内部调用方。OpenAPI 对：

- 机器调用
- SDK 生成
- 文档展示
- 长期稳定接口

更合适。

#### pg-boss

v1 用 `pg-boss`，不急着上 `Redis + BullMQ`。

这样可以：

- 少一层运行时依赖
- 保持任务调度和主库事务一致性
- 简化 NAS 运维

## Why Not Use MySQL as Primary DB

尽管 NAS 上已有 MySQL，这里仍建议新起独立 Postgres，原因如下：

1. 现有 MySQL 是共享基础设施，业务隔离不如独立库清晰
2. 本系统的数据模型和查询模式更偏 Postgres 友好
3. 后续复盘、趋势、事件、全文检索演进空间更大
4. NAS 上已经证明 Postgres 运行无障碍

最终决策：

- `Traefik` 复用
- `MySQL` 不作为主库
- `Redis` v1 不依赖
- `Postgres 17` 新起独立实例

## Deployment Design

### Compose Layout

建议单独一个 compose 项目：

```text
personal-okr-system/
├── docker-compose.yml
├── .env
├── postgres/
├── app/
└── backups/
```

服务建议只有两项：

- `app`
- `db`

可选：

- `backup`

### Network

- 应用容器加入现有 `Traefik` 使用的代理网络
- 数据库只暴露给应用内部网络

### Domain

使用现有 NAS 域名体系新增一个子域名，例如：

- `okr.<your-domain>`

### Persistence

数据库、上传文件、导出文件、日志都必须有独立持久化卷。

### Backup

至少支持：

- 每日数据库备份
- 周期性导出 JSON
- 必要时导出 markdown 归档

## Migration Plan

### Import Sources

首批迁移来源：

- `07-个人目标/*个人OKR.md`
- `07-个人目标/*任务清单.md`
- `14-协议/事件-KR映射.md`
- `06-复盘/个人/*.md`

### Import Strategy

第一阶段只做单向导入：

- markdown -> database

导入后，旧文件保留，不自动删除。

### Export Strategy

v1 提供两种导出：

- JSON 全量导出
- markdown 周期归档导出

## Alpha Milestones

### Phase 0: Foundation

- 初始化仓库
- 建库建表
- 接入 Traefik
- 跑通单用户登录和 PAT

### Phase 1: OKR Core

- 周期管理
- Objective / KR CRUD
- KR check-in
- 当前周期 dashboard

### Phase 2: Tasks Core

- Inbox / Today / Scheduled / Someday
- 任务详情
- 关联 KR
- 列表视图

### Phase 3: Calendar + Quadrants

- Calendar 月 / 周视图
- 拖拽改期
- 四象限视图

### Phase 4: Review

- 周复盘
- 月复盘
- KR 进度快照

### Phase 5: Hermes API

- agent 查询接口
- agent 写入接口
- 自动草稿接口

### Phase 6: Import / Export

- markdown 导入
- JSON / markdown 导出

## Estimated Timeline

在 AI-first 开发方式下，按“单用户正式产品”口径估算：

- 原型 + 核心流程打通：`3-5 天`
- 可日用 Alpha：`1-2 周`
- 稳定 Beta：`3-5 周`

这里默认：

- 产品 owner 明确
- 大部分代码由 agent 协作生成
- 不把多人协作需求提前塞进 v1

## Risks

### 1. 日历和任务交互复杂度被低估

风险不在 CRUD，而在拖拽、改期、重复任务、状态一致性。

应对：

- v1 优先做最小可用交互
- 不在第一阶段加入过度复杂的 recurrence 规则

### 2. 复盘自动化过度机械

应对：

- 保留手动编辑入口
- KR check-in 允许手动覆盖自动计算

### 3. 继续依赖旧 markdown 心智

应对：

- 明确数据库是真源
- markdown 改为导入源和归档导出

### 4. 过早设计多人能力

应对：

- 数据模型保留 `owner_id` 兼容余地
- UI 和权限先按单用户做

## Decision Summary

最终方案如下：

- 自研正式产品，不做薄应用
- 只服务个人和 Hermes
- 采用单体架构
- 复用 NAS 现有 `Traefik`
- 新起独立 `PostgreSQL 17`
- v1 不依赖现有共享 `Redis`
- 用 OpenAPI 作为 Hermes 接口层
- markdown 只做导入和归档，不再做主业务数据库

## Next Step

下一步进入实现前设计拆解：

1. 输出信息架构和页面树
2. 输出数据库 schema 草案
3. 输出 OpenAPI v1 草案
4. 创建项目仓并初始化代码骨架

## Information Architecture

### Top-Level Navigation

建议 v1 左侧主导航固定为：

- Dashboard
- OKR
- Tasks
- Calendar
- Quadrants
- Review
- Settings

### Page Tree

#### `/`

Dashboard，承载：

- 当前周期卡片
- 本周重点 KR
- Today 任务
- Inbox 计数
- 最近复盘摘要
- 最近 check-in

#### `/okr`

当前周期总览页：

- 当前周期摘要
- Objective 列表
- KR 进度条
- 快速 check-in 入口

#### `/okr/periods`

周期列表页：

- 当前周期
- 历史周期
- 已归档周期

#### `/okr/periods/:periodId`

周期详情页：

- Objective / KR 完整展开
- 周期统计
- 周期复盘入口

#### `/okr/key-results/:krId`

KR 详情页：

- 指标定义
- 进度历史
- check-in 列表
- 关联任务
- 关联复盘快照

#### `/tasks`

任务主视图，支持 tab：

- Inbox
- Today
- Next
- Scheduled
- Waiting
- Someday
- Done

#### `/tasks/:taskId`

任务详情抽屉或详情页：

- 标题
- 描述
- 状态
- 优先级
- 重要性 / 紧急性
- 预计时长
- 日期
- 子任务
- 关联 KR
- 历史操作

#### `/calendar`

日历页：

- Month / Week 切换
- 拖拽改期
- 筛选器
- 侧边任务池

#### `/quadrants`

四象限页：

- 四个象限看板
- 任务拖动调整象限
- 批量改优先级

#### `/review`

复盘主页：

- 最近周复盘
- 最近月复盘
- 当前周期复盘入口
- 自动草稿状态

#### `/review/weeks/:weekKey`

周复盘详情

#### `/review/months/:monthKey`

月复盘详情

#### `/settings`

基础设置页：

- PAT tokens
- 导入导出
- 默认周期
- 默认视图
- 数据备份说明

## UX Flows

### Flow 1: 新建待办并关联 KR

1. 用户在任意页 quick add 新建待办
2. 系统提供可搜索 KR picker
3. 保存后任务出现在对应视图
4. KR 详情页同步显示该任务

### Flow 2: 周 check-in

1. 用户进入 Dashboard 或 KR 页
2. 看到“本周待 check-in”列表
3. 填写 current value / confidence / summary / blockers
4. 保存后 KR 进度和周复盘素材同步更新

### Flow 3: 生成周复盘草稿

1. Hermes 或用户触发生成
2. 系统聚合本周：
   - 已完成任务
   - 延期待办
   - KR check-in
   - daily_logs
3. 生成 draft
4. 用户补充后发布

## Database Schema Draft

以下为 v1 偏实现级别的 schema 草案，命名采用 snake_case。

### periods

```sql
periods (
  id uuid primary key,
  name text not null,
  period_type text not null,        -- quarter | half | year
  year int not null,
  period_code text not null,        -- 2026-H1 / 2026-Q3
  start_date date not null,
  end_date date not null,
  status text not null,             -- draft | active | archived
  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

### objectives

```sql
objectives (
  id uuid primary key,
  period_id uuid not null references periods(id),
  title text not null,
  description text,
  status text not null,             -- active | paused | done | archived
  position int not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

### key_results

```sql
key_results (
  id uuid primary key,
  objective_id uuid not null references objectives(id),
  title text not null,
  description text,
  metric_type text not null,        -- numeric | milestone | hybrid
  baseline_value numeric,
  baseline_text text,
  target_value numeric,
  target_text text,
  current_value numeric,
  current_text text,
  unit text,
  status text not null,             -- not_started | on_track | at_risk | off_track | done
  confidence int,                   -- 0-100
  weighting numeric,                -- for hybrid / future use
  start_date date,
  due_date date,
  notes text,
  position int not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

### kr_check_ins

```sql
kr_check_ins (
  id uuid primary key,
  kr_id uuid not null references key_results(id),
  check_in_date date not null,
  status text not null,
  confidence int,
  current_value numeric,
  current_text text,
  summary text,
  blockers text,
  created_by text not null default 'self',
  created_at timestamptz not null
)
```

### tasks

```sql
tasks (
  id uuid primary key,
  title text not null,
  description text,
  task_status text not null,        -- inbox | todo | in_progress | done | cancelled
  lane text not null,               -- inbox | today | next | scheduled | waiting | someday | done
  priority text not null,           -- low | medium | high | critical
  importance text not null,         -- low | high
  urgency text not null,            -- low | high
  scheduled_date date,
  due_date date,
  starts_at timestamptz,
  ends_at timestamptz,
  estimated_minutes int,
  completed_at timestamptz,
  recurrence_rule text,
  sort_order numeric,
  parent_task_id uuid references tasks(id),
  source_type text,                 -- manual | import | hermes
  source_ref text,
  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

### task_kr_links

```sql
task_kr_links (
  task_id uuid not null references tasks(id),
  kr_id uuid not null references key_results(id),
  primary key (task_id, kr_id)
)
```

### task_tags

```sql
tags (
  id uuid primary key,
  name text not null unique,
  color text,
  created_at timestamptz not null
)

task_tags (
  task_id uuid not null references tasks(id),
  tag_id uuid not null references tags(id),
  primary key (task_id, tag_id)
)
```

### reviews

```sql
reviews (
  id uuid primary key,
  review_type text not null,        -- week | month | cycle
  period_key text not null,         -- 2026-W19 / 2026-05 / 2026-H1
  status text not null,             -- draft | published
  summary text,
  wins text,
  lessons text,
  blockers text,
  next_focus text,
  generated_by text,                -- system | hermes | self
  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

### review_kr_snapshots

```sql
review_kr_snapshots (
  id uuid primary key,
  review_id uuid not null references reviews(id),
  kr_id uuid not null references key_results(id),
  status text not null,
  progress_value numeric,
  progress_text text,
  notes text
)
```

### daily_logs

```sql
daily_logs (
  id uuid primary key,
  log_date date not null unique,
  mood int,
  mood_tag text,
  energy text,
  notes text,
  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

### agent_tokens

```sql
agent_tokens (
  id uuid primary key,
  name text not null,
  token_hash text not null,
  scopes jsonb not null,
  last_used_at timestamptz,
  created_at timestamptz not null,
  revoked_at timestamptz
)
```

## OpenAPI v1 Draft

### Auth Model

- `Authorization: Bearer <PAT>`
- scopes 最少支持：
  - `tasks:read`
  - `tasks:write`
  - `okr:read`
  - `okr:write`
  - `reviews:read`
  - `reviews:write`

### API Groups

#### Health

- `GET /api/v1/health`
- `GET /api/v1/version`

#### Periods

- `GET /api/v1/periods`
- `GET /api/v1/periods/current`
- `GET /api/v1/periods/{periodId}`
- `POST /api/v1/periods`
- `PATCH /api/v1/periods/{periodId}`

#### Objectives

- `GET /api/v1/objectives`
- `GET /api/v1/objectives/{objectiveId}`
- `POST /api/v1/objectives`
- `PATCH /api/v1/objectives/{objectiveId}`
- `DELETE /api/v1/objectives/{objectiveId}`

#### Key Results

- `GET /api/v1/key-results`
- `GET /api/v1/key-results/{krId}`
- `POST /api/v1/key-results`
- `PATCH /api/v1/key-results/{krId}`
- `POST /api/v1/key-results/{krId}/check-ins`
- `GET /api/v1/key-results/{krId}/check-ins`

#### Tasks

- `GET /api/v1/tasks`
- `GET /api/v1/tasks/{taskId}`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/{taskId}`
- `DELETE /api/v1/tasks/{taskId}`
- `POST /api/v1/tasks/{taskId}/links/key-results`
- `DELETE /api/v1/tasks/{taskId}/links/key-results/{krId}`
- `GET /api/v1/tasks/views/today`
- `GET /api/v1/tasks/views/inbox`
- `GET /api/v1/tasks/views/calendar`
- `GET /api/v1/tasks/views/quadrants`

#### Reviews

- `GET /api/v1/reviews`
- `GET /api/v1/reviews/{reviewId}`
- `POST /api/v1/reviews`
- `PATCH /api/v1/reviews/{reviewId}`
- `POST /api/v1/reviews/generate/weekly`
- `POST /api/v1/reviews/generate/monthly`
- `POST /api/v1/reviews/generate/cycle`

#### Agent Shortcuts

保留一组更适合 Hermes 调用的聚合接口：

- `GET /api/v1/agent/dashboard`
- `GET /api/v1/agent/today`
- `POST /api/v1/agent/tasks/quick-add`
- `POST /api/v1/agent/check-ins/quick-add`
- `POST /api/v1/agent/reviews/weekly-draft`

### Example Payloads

#### `POST /api/v1/tasks`

```json
{
  "title": "发布第 1 期周刊",
  "lane": "today",
  "priority": "high",
  "importance": "high",
  "urgency": "high",
  "scheduledDate": "2026-05-06",
  "estimatedMinutes": 90,
  "keyResultIds": ["kr_xxx"]
}
```

#### `POST /api/v1/key-results/{krId}/check-ins`

```json
{
  "checkInDate": "2026-05-06",
  "status": "on_track",
  "confidence": 80,
  "currentValue": 3,
  "summary": "本周已发布 3 篇，节奏开始稳定",
  "blockers": "排版耗时仍偏高"
}
```

## Repository and App Structure

### Suggested Repo

建议单独一个 `project repo`，不要把运行时代码直接堆在当前 `note/` 仓库。

索引卡后续进入 `12-项目索引/`。

### Suggested Directory Layout

```text
personal-okr-system/
├── apps/
│   └── web/
├── packages/
│   ├── db/
│   ├── api-contract/
│   ├── ui/
│   └── config/
├── infra/
│   ├── docker/
│   └── traefik/
├── scripts/
├── docs/
└── README.md
```

### Why Monorepo

尽管 v1 只有一个 web app，仍建议 monorepo，原因：

- 数据层、契约层、UI 组件层可清晰分包
- Hermes SDK / OpenAPI 客户端后续可独立输出
- 对 agent 并行开发更友好

## Initialization Plan

### Step 1

创建项目仓，初始化：

- pnpm workspace
- Next.js app
- TypeScript
- Tailwind v4
- shadcn/ui

### Step 2

建立数据库基础：

- Docker Compose
- Postgres 17
- Drizzle schema
- migration pipeline

### Step 3

建立 API 契约层：

- OpenAPI 文档
- route handlers
- PAT auth

### Step 4

先做两条主链路：

- OKR CRUD
- Tasks CRUD + KR linking

### Step 5

补高频视图：

- Dashboard
- Today
- Calendar
- Quadrants

### Step 6

补复盘与 Hermes：

- weekly draft
- monthly draft
- agent shortcut endpoints

## Alpha Exit Criteria

满足以下条件才算 Alpha 完成：

- 能创建周期、Objective、KR
- 能给 KR 做 check-in
- 能创建待办并关联 KR
- 有 Today / Calendar / Quadrants 三个核心视图
- 能生成周复盘草稿
- Hermes 能查 Today、加待办、写 check-in
- 能从现有 markdown 导入一轮真实数据
