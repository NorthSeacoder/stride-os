# Stride OS External API Guide

本文档梳理 `Stride OS` 当前对外可访问的 HTTP API，面向外部自动化调用、Hermes、CLI、脚本集成和后续第三方接入。

当前正式访问地址：

- `https://stride-os.mengpeng.tech`

## Access Modes

当前 API 有两种访问方式：

- Session Cookie：适合浏览器内已登录用户
- Bearer API Key：适合外部脚本、Agent、CLI、定时任务

对于外部访问，推荐统一使用：

```http
Authorization: Bearer <your_api_key>
```

## Auth and Token APIs

这组接口主要用于登录和管理 API Key。本身不是业务 API，但外部调用链通常会先经过这里。

### `POST /api/auth/login`

功能：

- 使用邮箱和密码登录
- 返回登录态 Cookie

请求体：

```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

典型用途：

- 浏览器登录
- 自动化脚本先登录，再申请临时 API Key

### `POST /api/auth/logout`

功能：

- 清除当前登录态 Cookie

### `GET /api/tokens`

功能：

- 列出当前登录用户的 API Key 元数据
- 返回字段包含 `id`、`name`、`createdAt`、`lastUsedAt`、`expiresAt`、`revokedAt`

认证要求：

- 仅支持 Session Cookie

### `POST /api/tokens`

功能：

- 为当前登录用户创建新的 API Key
- 响应中返回一次性明文 `plainToken`

请求体：

```json
{
  "name": "my-automation-token"
}
```

认证要求：

- 仅支持 Session Cookie

注意：

- 明文 token 只会在创建时返回一次
- 外部自动化应保存这个 token，并在后续请求中使用 Bearer 方式传递

### `DELETE /api/tokens/{id}`

功能：

- 撤销指定 API Key

认证要求：

- 仅支持 Session Cookie

## Health API

### `GET /api/health`

功能：

- 健康检查
- 用于容器探活、反向代理检查、外部可用性探测

是否需要认证：

- 不需要

典型用途：

- Docker healthcheck
- 1Panel / Traefik / OpenResty / 监控系统探活

## Identity API

### `GET /api/v1/me`

功能：

- 返回当前调用者对应的用户信息

是否适合外部使用：

- 适合
- 常用于验证 Bearer token 是否有效

## Task APIs

任务 API 适合 Hermes、CLI、脚本自动化，是当前最完整的外部业务接口之一。

### `GET /api/v1/tasks`

功能：

- 按任务来源查询任务列表

常用查询参数：

- `source=all`
- `source=today`
- `source=tomorrow`
- `source=inbox`
- `source=next-7-days`
- `source=list:<listId>`

### `POST /api/v1/tasks`

功能：

- 创建任务

常见字段：

- `title`
- `listId`
- `notes`
- `description`
- `dueDate`
- `priority`
- `energy`
- `completedAt`
- `keyResultIds`

注意：

- 当前线上环境里，外部创建任务时建议显式传 `listId`
- 已验证 `listId=aa055e31-4068-4cd1-9dbe-858f06c5b5de` 对应系统收集箱

### `GET /api/v1/tasks/{id}`

功能：

- 获取单个任务详情

### `PATCH /api/v1/tasks/{id}`

功能：

- 更新任务字段

### `POST /api/v1/tasks/{id}/complete`

功能：

- 将任务标记为完成

### `POST /api/v1/tasks/{id}/restore`

功能：

- 将已完成任务恢复为未完成

### `POST /api/v1/tasks/{id}/archive`

功能：

- 归档任务
- 当前外部删除语义应理解为 archive，不是 hard delete

### `POST /api/v1/tasks/{id}/quadrant`

功能：

- 把任务移动到四象限视图中的目标象限

用途：

- 自动化调整任务优先级结构

### `GET /api/v1/tasks/reminders`

功能：

- 返回无状态 reminder 候选任务

常用查询参数：

- `today=YYYY-MM-DD`
- `to=YYYY-MM-DD`

用途：

- Hermes / cron / CLI 自己决定何时真正发提醒

### `GET /api/v1/tasks/today`

功能：

- 获取 today 智能视图任务

### `GET /api/v1/tasks/inbox`

功能：

- 获取 inbox 智能视图任务

### `GET /api/v1/tasks/quadrants`

功能：

- 获取四象限视图任务

查询参数：

- `includeCompleted=true|false`

## OKR APIs

OKR API 覆盖 period、objective、key result、check-in 四层结构，适合外部自动化写入和复盘整合。

### `GET /api/v1/okr/current`

功能：

- 获取当前周期 OKR 汇总

### `GET /api/v1/okr/periods`

功能：

- 列出 OKR 周期

### `POST /api/v1/okr/periods`

功能：

- 创建 OKR 周期

常见字段：

- `name`
- `type`
- `startDate`
- `endDate`
- `status`

### `GET /api/v1/okr/periods/{id}`

功能：

- 获取单个 OKR 周期

### `PATCH /api/v1/okr/periods/{id}`

功能：

- 更新 OKR 周期

### `POST /api/v1/okr/periods/{id}/archive`

功能：

- 归档 OKR 周期

### `GET /api/v1/okr/periods/{id}/objectives`

功能：

- 列出指定周期下的 objectives

### `POST /api/v1/okr/objectives`

功能：

- 创建 objective

常见字段：

- `periodId`
- `title`
- `description`
- `status`
- `sortOrder`

### `GET /api/v1/okr/objectives/{id}`

功能：

- 获取 objective 详情

### `PATCH /api/v1/okr/objectives/{id}`

功能：

- 更新 objective

### `POST /api/v1/okr/objectives/{id}/archive`

功能：

- 归档 objective

### `POST /api/v1/okr/key-results`

功能：

- 创建 key result

常见字段：

- `objectiveId`
- `title`
- `type`
- `targetValue`
- `currentValue`
- `unit`
- `status`
- `confidence`

### `GET /api/v1/okr/key-results/{id}`

功能：

- 获取 key result 详情

### `PATCH /api/v1/okr/key-results/{id}`

功能：

- 更新 key result

### `POST /api/v1/okr/key-results/{id}/archive`

功能：

- 归档 key result

### `GET /api/v1/okr/key-results/{id}/check-ins`

功能：

- 列出某个 key result 的 check-ins

### `POST /api/v1/okr/key-results/{id}/check-ins`

功能：

- 创建 namespaced check-in

常见字段：

- `progressValue`
- `confidence`
- `summary`
- `blockers`
- `nextActions`

### `POST /api/v1/key-results/{id}/check-ins`

功能：

- 兼容旧路径的 check-in 创建接口

说明：

- 新集成建议优先使用 `/api/v1/okr/key-results/{id}/check-ins`
- 这个旧路径主要用于兼容历史调用方

## Review APIs

Review API 适合外部生成草稿、拉上下文、保存复盘结果。

### `POST /api/v1/reviews/weekly/draft`

功能：

- 根据起止日期生成 weekly review draft

请求字段：

- `periodStart`
- `periodEnd`

用途：

- 让 Agent 先拿到一版系统生成草稿，再决定是否保存或修改

### `GET /api/v1/reviews`

功能：

- 列出 review 列表

### `POST /api/v1/reviews`

功能：

- 保存 review draft

常见字段：

- `type`
- `periodStart`
- `periodEnd`
- `title`
- `body`
- `structuredSummary`
- `keyResultIds`

### `GET /api/v1/reviews/{id}`

功能：

- 获取 review 详情

### `PATCH /api/v1/reviews/{id}`

功能：

- 更新 draft review
- 兼容用 `status=final` 直接完成 finalize 的旧行为

### `POST /api/v1/reviews/{id}/finalize`

功能：

- 显式 finalize 某条 review

### `POST /api/v1/reviews/{id}/archive`

功能：

- 归档 review

### `GET /api/v1/reviews/context`

功能：

- 拉取 review 写作上下文

支持的上下文类型：

- `daily`
- `weekly`
- `monthly`
- `period`

常见查询参数：

- `type`
- `start`
- `end`

用途：

- 让外部 Agent 在不直接拼业务 SQL 的前提下，拿到复盘所需上下文

## Example APIs

这组接口来自模板基线，更多是示例性质，不是当前产品主业务能力。

### `GET /api/v1/examples`

功能：

- 列表示例资源

### `POST /api/v1/examples`

功能：

- 创建示例资源

### `GET /api/v1/examples/{id}`

功能：

- 获取示例资源详情

### `PATCH /api/v1/examples/{id}`

功能：

- 更新示例资源

### `DELETE /api/v1/examples/{id}`

功能：

- 删除示例资源

## Recommended External Surface

如果目标是 Hermes、CLI、自动化脚本或第三方 Agent，当前最值得依赖的是：

- `GET /api/health`
- `GET /api/v1/me`
- 全部 `tasks` 相关接口
- 全部 `okr` 相关接口
- `reviews/weekly/draft`
- `reviews`
- `reviews/{id}`
- `reviews/{id}/finalize`
- `reviews/{id}/archive`
- `reviews/context`

不建议把这些作为长期外部集成主入口：

- `/api/auth/*`
  - 更适合人类登录流程或内部换取 session
- `/api/tokens/*`
  - 适合管理 API Key，不适合作为业务调用接口
- `/api/v1/examples/*`
  - 更偏模板示例

## Minimal External Workflow

一个典型外部自动化流程通常是：

1. 人工登录后台或脚本通过 Session 创建 API Key
2. 保存 `plainToken`
3. 后续统一使用 `Authorization: Bearer <token>`
4. 用 `/api/v1/me` 做 token 校验
5. 根据需要调用 task / okr / review 接口

## Notes

- 当前正式域名链路和 Bearer API Key 链路已经实测可用
- 线上已验证 task、OKR、review 全链路写读归档行为
- task 创建时建议显式传 `listId`
- API 当前以归档语义替代硬删除语义
