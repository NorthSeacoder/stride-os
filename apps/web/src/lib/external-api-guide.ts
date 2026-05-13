export const externalApiGuide = `# Stride OS External API Guide

本文档面向外部 Agent、脚本、CLI 和第三方集成，说明如何发现并正确使用 Stride OS 的对外 HTTP API。

## Public Entry Points

当前线上站点：

- https://stride-os.mengpeng.tech

建议外部 Agent 按下面顺序发现能力：

1. GET /llm.txt
2. GET /api/openapi.json
3. GET /docs/api-external-access.md

各入口职责：

- llm.txt：给通用 LLM/Agent 的轻量发现入口
- openapi.json：机器可消费的接口真相源
- 本文档：给人看的集成导览、调用建议和例外约定

如果三者冲突，优先级如下：

1. 实际线上接口行为
2. openapi.json
3. 本文档
4. 历史示例、旧提示词、缓存知识

## Authentication

当前支持两种访问方式：

- Session Cookie：适合浏览器内已登录用户
- Bearer API Key：适合外部脚本、Agent、CLI、定时任务

对于外部自动化，推荐统一使用：

\`\`\`http
Authorization: Bearer <your_api_key>
\`\`\`

推荐的第一步校验请求：

\`\`\`http
GET /api/v1/me
\`\`\`

用途：

- 验证 Bearer token 是否有效
- 验证当前身份是否符合预期

## Session and Token Management

以下接口主要服务于“登录后创建或管理 API Key”的流程：

- POST /api/auth/login
- POST /api/auth/logout
- GET /api/tokens
- POST /api/tokens
- DELETE /api/tokens/{id}

关键约定：

- GET /api/tokens、POST /api/tokens、DELETE /api/tokens/{id} 仅支持 Session Cookie
- POST /api/tokens 返回的一次性 plainToken 只会出现一次，必须立即保存

## Machine-Readable Contract

外部 Agent 在真正构造请求前，应该读取：

- GET /api/openapi.json

它用于提供：

- 路径和方法
- query/path/body schema
- 认证声明
- 响应结构

当前对外 API 主要覆盖这些资源组：

- Identity: /api/v1/me
- Tasks: /api/v1/tasks*
- OKR: /api/v1/okr* 与 /api/v1/key-results/*
- Reviews: /api/v1/reviews*
- Activity: /api/v1/activity
- Health: /api/health

## Stride-Specific Usage Notes

这些内容更适合放在导览文档里，而不是放进 OpenAPI schema 注释中：

- 对外自动化优先使用 Bearer API Key，不建议长期依赖登录态 Cookie
- 任务删除语义应优先理解为 archive，不要默认存在 hard delete
- 外部创建任务时，如果工作流依赖特定列表，建议显式传 listId
- GET /api/v1/me 是最适合的 token 探针请求

## Integration Pattern

推荐外部 Agent 使用以下调用顺序：

1. 读取 llm.txt
2. 获取 openapi.json
3. 用 GET /api/v1/me 验证认证
4. 按 OpenAPI contract 发起真实业务请求
5. 仅在需要业务约定或排错提示时回看本文档

## Notes for Maintainers

维护这套外部接入材料时，遵循以下原则：

- 不要把本文档维护成第二份完整接口表
- 以 packages/api-contract 导出的 OpenAPI contract 作为接口真相源
- 本文档只保留面向人的导览、调用约定、风险提示和例外说明
`;
