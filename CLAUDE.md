# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Primary Reference

All commands, coding conventions, testing, commit style, and security rules are in [AGENTS.md](AGENTS.md). Read it first — this file only adds what it doesn't cover.

## Architecture Insights

These patterns span multiple files and aren't obvious from reading any single one:

### Dual-Database (SQLite / PostgreSQL)

`packages/db` maintains two parallel Drizzle schemas (`schema/sqlite.ts` and `schema/postgres.ts`) that export identical entity shapes. `packages/db/src/client.ts` switches dialects at runtime based on `DATABASE_DRIVER` env. SQLite is the zero-config local default; PostgreSQL is for production/Docker. When adding schema fields, update both files.

### Dual Auth Modes

- **Session cookie**: Browser login via `POST /api/auth/login`, validated through `apps/web/src/lib/session.ts`.
- **Bearer API key**: For external agents, issued via `/api/tokens`, validated through `apps/web/src/lib/pat.ts`. API routes check both modes.

### Service Layer

Route handlers and server actions don't query the DB directly. They call domain services in `apps/web/src/lib/services/` (activity, okr, review, task). These services own the business logic and use `@stride-os/db` for data access.

### Agent-Native API

The system is designed for agent consumption: `llm.txt` at the site root, `openapi.json` at `/api/openapi.json`, and Bearer token auth. The skill at `.agents/skills/stride-os-api/SKILL.md` documents this for agent callers.

### Package Dependency Graph

`apps/web` → `@stride-os/db`, `@stride-os/api-contract`, `@stride-os/ui`, `@stride-os/config`
Packages `db`, `api-contract`, `config`, `ui` are type-only (no runtime build outputs) — their `turbo.json` overrides set empty outputs.

## Claude Code Operations

### Running a Single Test

```bash
pnpm vitest run apps/web/src/__tests__/path/to/test.test.ts
```

The root `vitest.config.ts` maps `@` → `apps/web/src`, so test imports use the same `@/` paths as app code.

### Before Pushing

Always run `pnpm check:ci` — it chains lint, typecheck, test, and build.

### Schema Changes Workflow

1. Edit both `packages/db/src/schema/sqlite.ts` and `postgres.ts`
2. Run `pnpm db:generate` to create the migration SQL
3. Run `pnpm db:migrate` to apply
4. Run `pnpm test` to verify migration tests pass

### Design System

UI changes must respect `DESIGN.md` (human-readable) and `.impeccable/design.json` (machine-readable tokens). The visual identity is "cold graphite + ice signal" — dark backgrounds, cool gray/blue accents, high contrast for data density.
