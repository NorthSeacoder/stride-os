# Stride OS

`Stride OS` is a self-hosted, agent-native personal execution system for OKR tracking, tasks, reviews, and Hermes-facing APIs.

The repository is now bootstrapped from the shared Next.js template so future product work can start from a working full-stack baseline instead of a docs-only shell.

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Default local mode uses SQLite and does not require PostgreSQL.

### 3. Set up database

```bash
pnpm db:setup
```

This creates or opens the local SQLite database, runs migrations, and seeds the admin user from `.env`.

### 4. Start development

```bash
pnpm dev
```

Visit `http://localhost:3000` and log in with the seeded admin credentials from `.env`.

Before pushing, run:

```bash
pnpm check:ci
```

## Current Baseline

The codebase currently includes the template foundation:

- Next.js App Router web app
- session auth and personal access tokens
- SQLite-first local DB setup
- PostgreSQL deployment path
- OpenAPI v1 package
- example protected dashboard and CRUD flow

Product-specific OKR, task, calendar, quadrant, and review modules will be planned next on top of this baseline.

## Database Modes

Local default:

- `DATABASE_DRIVER=sqlite`
- `DATABASE_URL=file:./packages/db/data/dev.sqlite`

Deployment:

- switch to `.env.postgres.example`
- set PostgreSQL connection values
- run `pnpm db:migrate`
- run `pnpm db:seed`

See [docs/database.md](/Users/yqg/personal/webs/stride-os/docs/database.md:1) for details.

## NAS Deployment

The production path is designed for Traefik + PostgreSQL-based self-hosted deployment.

See [docs/deployment-nas.md](/Users/yqg/personal/webs/stride-os/docs/deployment-nas.md:1).

## Existing Product Notes

The earlier product design notes are preserved in:

- [docs/plans/2026-05-05-personal-okr-system-design.md](/Users/yqg/personal/webs/stride-os/docs/plans/2026-05-05-personal-okr-system-design.md:1)

These documents should now be treated as product planning input on top of the working template codebase, not as the repository structure source of truth.
