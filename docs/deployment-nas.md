# NAS Deployment Notes

## Purpose

本文档记录 `Stride OS` 在 NAS 环境下的基础部署约束，避免后续业务开发阶段重复摸索公共基础设施。

默认原则：

- shared infra first：优先复用 NAS 公共基础设施
- self-host first：保持项目可在单机 / NAS 自主部署
- 项目只携带自身业务容器，不重复声明公共基础设施

当前仓库区分两条路径：

- 本地默认开发：SQLite-first
- NAS/服务器部署：PostgreSQL-first

本文仅覆盖部署路径，不是本地首次启动指南。

## Shared Infrastructure

当前 NAS 上可复用的公共基础设施：

- reverse proxy: `traefik`
- docker network: `proxy`
- shared postgres: `shared-postgres`
- analytics: `umami` instance

当前不作为默认依赖的公共服务：

- `redis`
- browser automation containers
- object storage

## Shared PostgreSQL

运行原则：

- 公共实例负责数据库服务本身
- 每个业务项目负责自己的 schema、user、password、migration、seed
- 禁止应用长期使用 `postgres` 超级用户
- 禁止把 Postgres 直接暴露到公网

默认隔离策略：

- 默认采用共享 database + 项目独立 schema
- 独立 database 作为可选 fallback，仅在确有隔离或权限要求时使用
- 不依赖表名前缀作为主隔离机制

## Project Onboarding

新项目接入公共 PostgreSQL 时，至少需要：

1. 确认目标共享 database
2. 创建项目独立 schema
3. 创建项目独立数据库用户
4. 授权该用户访问自己的 schema
5. 在项目 `.env` 中写入连接信息和 schema 名
6. 用项目自己的 migration 初始化 schema

推荐从 `.env.postgres.example` 开始，而不是 `.env.example`。

推荐环境变量：

```text
DATABASE_DRIVER=postgres
DB_HOST=shared-postgres
DB_PORT=5432
DB_NAME=<shared_db_name>
DB_USER=<project_db_user>
DB_PASSWORD=<project_db_password>
DB_SSL=false
DATABASE_SCHEMA=stride_os
DATABASE_URL=postgresql://<project_db_user>:<project_db_password>@shared-postgres:5432/<shared_db_name>
```

## Production Compose Pattern

NAS 生产环境下，项目 `compose.prod.yml` 应优先采用单服务模式：

```text
web
```

约束：

- `web` 加入外部 `proxy` network
- `DATABASE_DRIVER=postgres`
- 通过 `DATABASE_URL` 连接公共 `shared-postgres`
- 通过 `DATABASE_SCHEMA` 指定当前项目 schema
- 通过 `IMAGE_TAG` 固定到明确发布版本
- 通过 Traefik labels 挂正式域名
- 默认走 `websecure` + TLS
- 不在项目 compose 内重复声明 Postgres 服务

## Domain And Analytics

生产环境建议通过 NAS / 1Panel 注入：

- `HOST`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_UMAMI_SCRIPT_URL`
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID`

站点统计接入方式：

- Umami script URL 走环境变量
- website id 走环境变量

接入要求：

- 追踪脚本直接注入应用根布局
- `NEXT_PUBLIC_APP_URL` 必须与正式域名一致
- Traefik `Host` 规则必须与正式域名一致

## Release Automation

稳定开发后，推荐通过 git tag（如 `v0.1.0`）触发 GitHub Actions 自动构建并推送镜像。

约束：

- `main` 负责 CI，版本 tag 负责 release image
- 本地 `docker build` / `docker compose` 路径必须继续可用
- registry、镜像名、tag 规则和凭据来源需要在仓库文档或 workflow 注释中写清楚
