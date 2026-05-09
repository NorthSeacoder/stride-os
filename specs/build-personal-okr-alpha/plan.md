# Implementation Plan: Personal OKR Alpha

**Workspace**: `stride-os` | **Date**: 2026-05-09 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/build-personal-okr-alpha/spec.md`

---

## Summary

Build a single-user OKR system that is task-first, review-aware, and API-first for Hermes. The recommended path is to keep the UI and agent API on the same service layer, start with core data model and task flows, then layer OKR, review, quadrants, and dashboard aggregation on top.

---

## Architecture Overview

Current repo shape already gives the right base:

- `packages/db` owns dual SQLite/Postgres schema and migrations.
- `packages/api-contract` owns the v1 OpenAPI surface.
- `apps/web` owns App Router pages, route handlers, server actions, and server-first UI.

The Alpha should extend that split instead of introducing a parallel architecture:

1. **Database layer** stores periods, objectives, key results, tasks, links, check-ins, and reviews as source of truth.
2. **Service layer** provides CRUD and query helpers for UI and API routes.
3. **UI layer** uses server components + server actions for forms, plus route handlers where the flow is more naturally API-shaped.
4. **Agent API layer** uses `/api/v1` route handlers and PAT auth so Hermes can read/write the same objects.
5. **Aggregation layer** builds dashboard, review draft, and KR risk summaries from the same query primitives.

This matches the existing project pattern where React `useActionState` powers form-driven mutations in the UI, while Next.js route handlers expose HTTP endpoints for external consumers. React documents `useActionState` as an action state hook with a pending state and `<form action>` integration, and Next.js documents route handlers as app-router request handlers with standard HTTP methods. Sources: https://react.dev/reference/react/useActionState and https://nextjs.org/docs/app/building-your-application/routing/route-handlers.

---

## Key Design Decisions

### Decision 1: Keep UI mutations and API mutations on one shared service layer

- **Background**: The current app already has example CRUD implemented through server actions and API routes, but there is no OKR domain service yet.
- **Options**:
  - A: Duplicate logic in UI actions and API handlers - faster initially, but diverges quickly.
  - B: Centralize domain logic in shared services and call it from both UI and API - slightly more structure, but keeps UI and Hermes consistent.
- **Conclusion**: Choose B.
- **Impact**: Domain rules for task state, KR check-ins, and review saving live in one place and are reused by both UI and agent API.
- **Sources**: https://react.dev/reference/react/useActionState, https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations

### Decision 2: Use route handlers for Hermes-facing APIs

- **Background**: Hermes needs stable HTTP endpoints with bearer/PAT auth and predictable JSON.
- **Options**:
  - A: Use only Server Actions - good for UI, weak for external agent access.
  - B: Use route handlers under `/api/v1` - direct HTTP contract, easier for PAT clients.
- **Conclusion**: Choose B.
- **Impact**: OpenAPI stays the contract source for Hermes; UI can still call the same services internally.
- **Sources**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

### Decision 3: Make review creation a draft-first flow with explicit finalization

- **Background**: Weekly review needs to be editable before it becomes a durable record.
- **Options**:
  - A: Save only final reviews - simpler, but loses iterative editing.
  - B: Save draft first, then mark final - better for UI and Hermes collaboration.
- **Conclusion**: Choose B.
- **Impact**: Review records need status, body, structured summary, and snapshot data; APIs need both save and finalize paths.
- **Sources**: UNVERIFIED - product decision derived from spec, no framework dependency.

### Decision 4: Preserve Today-first task routing and four-quadrant viewing as task projections

- **Background**: The spec says `/tasks` opens on Today, and quadrants are a view over tasks rather than a separate system.
- **Options**:
  - A: Build quadrants as an independent workflow - extra state and duplicated rules.
  - B: Treat quadrants as a derived view over task metadata - lower risk and easier to maintain.
- **Conclusion**: Choose B.
- **Impact**: `important` and `urgent` stay task fields; task status and Today grouping remain separate concerns.
- **Sources**: UNVERIFIED - product decision derived from spec.

---

## Module Design

### Module: Database Schema

**职责**: Store the OKR domain as durable source of truth.

**改动概述**:

- Add period, objective, key result, KR check-in, task, task-KR link, review, and review KR snapshot tables to both SQLite and Postgres schema files.
- Keep timestamp style aligned with each driver, matching the existing `users`, `sessions`, `api_tokens`, `audit_logs`, and `example_items` layout.

**关键接口 / 行为**:

```text
periods -> objectives -> key_results
key_results -> kr_check_ins
tasks <-> key_results via task_kr_links
reviews -> review_kr_snapshots
```

**注意事项**:

- Keep the dual-schema files in sync.
- Preserve user, session, token, and audit log tables unchanged.
- Add indexes for the common lookup paths: current period, task status/view, KR ownership, review time range, and link joins.

### Module: Domain Services

**职责**: Encapsulate CRUD, state rules, and aggregation queries shared by UI and API.

**改动概述**:

- Replace the example service pattern with OKR/task/review services.
- Put status rules in one place: task Today grouping, task completion, KR check-in writes, review draft/final transitions.

**关键接口 / 行为**:

```text
listTodayTasks()
listInboxTasks()
listScheduledTasks()
listQuadrantTasks()
createTask()
updateTask()
completeTask()
linkTaskToKR()
createKRCheckIn()
buildWeeklyReviewDraft()
saveReviewDraft()
finalizeReview()
getDashboardSummary()
```

**注意事项**:

- UI and API must call the same service helpers.
- KR progress is never inferred from task completion alone.
- Review draft generation is read-heavy; saving is the only mutation step.

### Module: UI Pages and Actions

**职责**: Provide the user-facing workflow for Today-first execution, OKR review, quadrants, and dashboard.

**改动概述**:

- Replace the placeholder dashboard with an aggregated summary page.
- Add task-centric pages with Today as the default entry.
- Add OKR pages for period, objective, KR, and check-in management.
- Add a review page for draft generation, editing, and finalization.

**关键接口 / 行为**:

```text
/dashboard -> summary of current period, Today tasks, risky KRs, recent review
/tasks -> Today by default, with Inbox/Scheduled/Done subviews
/quadrants -> task projection by important/urgent
/okr -> period and KR management
/review -> weekly review draft and history
```

**注意事项**:

- The current app already uses server actions in forms; keep that pattern for internal UI mutations.
- Use client components only where local interaction state is needed.
- Do not make Dashboard the primary data entry point.

### Module: API Contract and Route Handlers

**职责**: Expose stable v1 endpoints for Hermes and external automation.

**改动概述**:

- Expand `packages/api-contract` with OKR, task, quadrant, and review schemas.
- Add `/api/v1` route handlers for current OKR, task queries, KR check-ins, review draft generation, review save/update, and summary endpoints.
- Keep PAT auth as the gate for agent access.

**关键接口 / 行为**:

```text
GET /api/v1/okr/current
GET /api/v1/tasks/today
GET /api/v1/tasks/inbox
GET /api/v1/tasks/quadrants
POST /api/v1/key-results/{krId}/check-ins
POST /api/v1/reviews/weekly/draft
POST /api/v1/reviews
PATCH /api/v1/reviews/{reviewId}
```

**注意事项**:

- Use standard route handlers and HTTP methods.
- The API should return machine-friendly JSON that mirrors UI semantics.
- Keep the OpenAPI contract in sync with implemented handlers.

### Module: Aggregation Queries

**职责**: Produce dashboard and review summaries from primary records.

**改动概述**:

- Create summary queries for current period status, Today counts, KR risk flags, and weekly review inputs.
- Keep aggregation pure and reusable so UI and API can call the same builders.

**关键接口 / 行为**:

```text
getCurrentPeriodSummary()
getRiskKRList()
getWeeklyReviewInputs(range)
getDashboardCardData()
```

**注意事项**:

- Aggregation must never mutate source records.
- Summary payloads should be stable enough for Hermes to consume.

---

## Data Model

Detailed entity and relationship notes live in [data-model.md](data-model.md).

---

## Project Structure

```text
packages/db/src/schema/sqlite.ts
packages/db/src/schema/postgres.ts
packages/db/src/seed.ts
packages/db/src/index.ts
packages/api-contract/src/v1/openapi.ts
apps/web/src/lib/services/*
apps/web/src/app/(dashboard)/dashboard/page.tsx
apps/web/src/app/(dashboard)/tasks/*
apps/web/src/app/(dashboard)/okr/*
apps/web/src/app/(dashboard)/quadrants/*
apps/web/src/app/(dashboard)/review/*
apps/web/src/app/api/v1/*
```

Likely tests:

```text
apps/web/src/__tests__/api/*
packages/db/src/__tests__/*
```

---

## Risks and Tradeoffs

- The biggest risk is letting task UI sprawl into a second generic task manager instead of staying tied to OKR flow.
- Review generation can become too clever too early; Alpha should stay on structured aggregation, not AI judgment.
- Dual schema maintenance in SQLite and Postgres must stay synchronized.
- Route handlers and server actions can drift if service logic is not centralized.
- Quadrant UX can become expensive if drag-and-drop is introduced too early; the first pass should keep it projection-based.

---

## Verification Strategy

1. Typecheck and lint the changed workspace packages.
2. Run db schema generation/migration checks for both drivers.
3. Add focused tests around task state transitions, KR check-in rules, and review save/finalize behavior.
4. Verify API contract paths in `packages/api-contract` align with route handlers.
5. Manually validate the Today-first workflow in the browser:
   - create task
   - move to Today
   - mark Must/Focus
   - link KR
   - create check-in
   - generate and save weekly review

---

## Design Artifacts

This plan produces:

| Artifact | Required | Notes |
|------|---------|------|
| plan.md | Yes | Main implementation plan |
| data-model.md | Yes | Entities, relationships, and state notes |
| tasks.md | Later | Generated in the tasks phase |

---

## Sources

| Decision | Source URL | Note |
|------|------|------|
| React action state for forms | https://react.dev/reference/react/useActionState | React 19 hook used by existing UI patterns |
| Next route handlers | https://nextjs.org/docs/app/building-your-application/routing/route-handlers | App Router HTTP endpoints |
| Next server actions and mutations | https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations | Mutation flow and form integration |
