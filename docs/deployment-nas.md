# NAS Deployment Notes

## Purpose

本文档记录 `Stride OS` 当前真实生效的 NAS 发布流程，覆盖容器、域名、HTTPS、统计脚本和数据库接入。目标是让后续新版本发布时，不再重复踩一遍基础设施细节。

当前区分两条运行路径：

- 本地开发：SQLite-first
- NAS/线上部署：PostgreSQL-first

## Effective Topology

本次上线后的实际拓扑如下：

1. `stride-os` 应用容器运行在 NAS 上
2. NAS 上的应用通过 Docker 网络访问共享 `shared-postgres`
3. NAS 内部 HTTP 入口由项目容器提供
4. 阿里云服务器上的 `1Panel/OpenResty` 负责正式域名 `<APP_DOMAIN>` 的 HTTPS 终止
5. 阿里云站点把外部请求反代到 NAS 的 HTTP 上游
6. Umami 脚本由应用根布局注入

这意味着：

- 应用部署和容器运维在 NAS 处理
- 域名、证书、外层 HTTPS 在阿里云 `1Panel` 处理
- 不再维护“只改 OpenResty 文件、不进面板”的长期状态

## Shared Infrastructure

当前复用的公共基础设施：

- NAS Docker 主机
- `shared-postgres`
- 项目 Docker 网络
- Umami 统计服务
- 阿里云 `1Panel` + OpenResty

当前未作为默认依赖：

- `redis`
- 对象存储
- 浏览器自动化容器

## Shared PostgreSQL Rules

共享 PostgreSQL 的约束保持不变：

- 每个项目使用独立 schema
- 每个项目使用独立数据库用户
- 应用连接不用超级用户
- migration、seed、授权由项目自己负责

推荐环境变量：

```text
DATABASE_DRIVER=postgres
DB_HOST=<shared_postgres_host>
DB_PORT=5432
DB_NAME=postgres
DB_USER=<project_db_user>
DB_PASSWORD=<project_db_password>
DB_SSL=false
DATABASE_SCHEMA=<project_schema>
DATABASE_URL=postgresql://<project_db_user>:<project_db_password>@<shared_postgres_host>:5432/postgres
```

## Release Flow

当前稳定发布流程：

1. 本地提交代码并推送远程分支
2. 通过版本 tag 触发 GitHub Actions 构建镜像
3. 产出镜像推送到 `ghcr.io/northseacoder/stride-os:<tag>`
4. NAS 上更新 `/vol1/1000/Docker/stride-os/.env` 与 `docker-compose.yml`
5. 拉取新镜像并重建容器；容器启动前会按需执行数据库 migration
6. 用正式域名做登录、关键页面和日志检查

当前已验证版本：

- `v0.1.0`
- `v0.1.1`

其中 `v0.1.1` 包含 PostgreSQL `search_path` 修复。

## NAS Side Steps

NAS 项目目录：

```text
/vol1/1000/Docker/stride-os
```

典型操作顺序：

1. 准备 `.env`
2. 固定 `IMAGE_TAG`
3. 确认 `DATABASE_URL`、`DATABASE_SCHEMA`、`SESSION_SECRET`
4. `docker pull ghcr.io/northseacoder/stride-os:<tag>`
5. `docker compose up -d`
6. `docker logs stride-os` 检查启动

项目容器最少需要确认这些变量：

- `HOST`
- `PORT`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_UMAMI_SCRIPT_URL`
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID`
- `DATABASE_URL`
- `DATABASE_SCHEMA`
- `SESSION_SECRET`

推荐在 NAS 单实例部署中开启启动前自动迁移：

```text
RUN_MIGRATIONS_ON_START=true
```

该开关会在应用进程启动前执行镜像内置的 PostgreSQL migration。迁移记录由 `__drizzle_migrations` 表控制，重复启动不会重复执行已应用迁移。若未来改为多副本部署，应改成独立 release job 先迁移，再启动应用副本，避免多个实例同时抢迁移。

Umami 接入建议：

- script: `<UMAMI_SCRIPT_URL>`
- website id: `<UMAMI_WEBSITE_ID>`

## 1Panel Domain Steps

当前推荐做法是让 `1Panel` 成为域名和 HTTPS 的唯一配置入口。

面板侧步骤：

1. 在 `1Panel` 新建站点，域名填 `<APP_DOMAIN>`
2. 反向代理上游指向 NAS 的 HTTP 地址
3. 在站点内申请或绑定 SSL 证书
4. 开启 HTTPS
5. 保持站点配置与 `1Panel` 数据库元信息一致，不再手改后长期漂移

注意：

- 如果只在 OpenResty 文件里临时加域名，`1Panel` 页面可能看不到对应站点
- 如果准备长期维护，最好回到面板托管
- 面板里已有可复用 ACME / DNS 配置时，可以直接复用，不必为每个站点重建

## Verification Checklist

每次发布后至少检查：

1. `docker ps` 中镜像 tag 是否正确
2. `docker logs stride-os` 是否出现 `[migrate] complete` 或明确的启动异常
3. 首页是否正常返回
4. 登录是否成功
5. 关键写操作是否产生 2xx 而不是 5xx
6. 阿里云站点 access log / error log 是否干净

## Common Failure Zones

这次部署暴露出的高频故障点：

1. schema 已创建，但 migration 并未真正落到该 schema
2. 应用连接虽然能连上 PG，但 `search_path` 设置错误
3. 业务用户没有拿到表和序列权限
4. 共享数据库里存在别的 schema 同名表，容易制造误判
5. 面板配置与手工 OpenResty 配置漂移

数据库细节见 [database.md](./database.md)。
