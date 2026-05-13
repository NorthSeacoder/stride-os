# Implementation Plan: Expand Automation API

**Feature**: `expand-automation-api`  
**Spec**: [spec.md](spec.md)  
**Created**: 2026-05-13  
**Status**: Draft

## Summary

Expose Stride OS core domains as stable Bearer-token APIs for NAS-hosted Hermes and future CLI usage. The implementation should expand `/api/v1` beyond the current read-heavy surface so clients can manage tasks, OKR periods/objectives/key results/check-ins, reviews, review context, and reminder candidates.

The plan keeps the current web UI behavior intact by reusing existing service-layer functions where possible, adding thin route handlers and contract schemas around them, and introducing only the data-state changes needed for archive semantics.

## Architecture Overview

Current shape:

- Next.js App Router route handlers live under `apps/web/src/app/api`.
- Bearer token auth is centralized through `apps/web/src/lib/auth/api-auth.ts`.
- Domain behavior already exists in `task-service.ts`, `okr-service.ts`, and `review-service.ts`.
- OpenAPI contract lives in `packages/api-contract/src/v1/openapi.ts`.
- SQLite and Postgres schema files are maintained in parallel under `packages/db/src/schema`.

Target shape:

```text
Hermes / CLI
  -> Authorization: Bearer <token>
  -> /api/v1/*
  -> api-auth.ts
  -> route validation helpers
  -> domain services
  -> db schema
```

Route handlers should remain thin: authenticate, parse/validate request input, call a service function, write audit logs for mutations, and return consistent JSON errors.

## Key Design Decisions

### Decision 1: Use `/api/v1` route handlers as the automation boundary

- **Background**: Existing automation APIs are already implemented as Next.js route handlers under `/api/v1`.
- **Options**:
  - A: Add a separate API server for Hermes/CLI.
  - B: Extend current `/api/v1` route handlers.
- **Conclusion**: Choose B.
- **Impact**: Lower deployment complexity on NAS; all clients use the same auth and domain services.
- **Sources**: Local code: `apps/web/src/app/api/v1`, `apps/web/src/lib/auth/api-auth.ts`; spec FR-001, FR-013.

### Decision 2: Reuse service-layer operations and avoid duplicating business rules in route handlers

- **Background**: Task, OKR, and review services already expose most domain operations needed by the API.
- **Options**:
  - A: Implement route handlers directly against Drizzle queries.
  - B: Route handlers call service-layer functions and add only API validation/response mapping.
- **Conclusion**: Choose B.
- **Impact**: Keeps UI actions and API behavior aligned; reduces risk of divergent task/OKR/review rules.
- **Sources**: Local code: `task-service.ts`, `okr-service.ts`, `review-service.ts`.

### Decision 3: Treat delete as archive for core business entities

- **Background**: The spec clarified that task, OKR, and review history should not be hard-deleted.
- **Options**:
  - A: Hard delete records.
  - B: Archive records and hide archived records from default list endpoints.
- **Conclusion**: Choose B.
- **Impact**: OKR entities can reuse existing `archived` status values; tasks and reviews need an archive representation if current schema lacks one.
- **Sources**: Spec FR-004, FR-007, FR-008, FR-009, FR-010.

### Decision 4: Keep reminders stateless in Stride OS for MVP

- **Background**: Hermes runs as a NAS Docker scheduled task and will control notification cadence.
- **Options**:
  - A: Store reminder delivery state in Stride OS.
  - B: Return reminder candidates based on task state and dates only.
- **Conclusion**: Choose B.
- **Impact**: No reminder table or reminder state machine in MVP; API returns candidates repeatedly while conditions match.
- **Sources**: Spec User Story 3, Task Reminder Candidate entity.

### Decision 5: Do not add token scopes, batch APIs, or idempotency keys in MVP

- **Background**: This is a personal deployment; Hermes and Stride OS both run inside NAS Docker, and the user prefers a simpler first version.
- **Options**:
  - A: Add scopes, bulk endpoints, and idempotency storage now.
  - B: Keep tokens full-access and write APIs single-record only.
- **Conclusion**: Choose B.
- **Impact**: Faster API rollout; revisit if CLI/Hermes usage shows duplicate-write or permission risks.
- **Sources**: Spec NFR-003, Out of Scope.

## Module Design

### Module: Shared API Utilities

**Responsibilities**:

- Standardize JSON error responses for API clients.
- Keep request parsing and string/date/enum validation consistent.
- Ensure protected API paths never return HTML login redirects.

**Changes**:

- Extend or reuse `apps/web/src/app/api/_lib/validation.ts`.
- Add helper behavior for `401`, `400`, `404`, and conflict-style responses where needed.
- Keep `getAuthUser(request)` as the common auth entry point.

**Important behaviors**:

- Missing or invalid Bearer token returns JSON 401.
- Validation errors return JSON 400 with actionable messages.
- Missing IDs return JSON 404, not empty success responses.

### Module: Task Automation API

**Responsibilities**:

- Expose task CRUD and task projections for CLI and Hermes.
- Provide reminder-candidate views without saving reminder state.
- Support task-to-key-result links.

**Proposed endpoints**:

```text
GET    /api/v1/tasks
POST   /api/v1/tasks
GET    /api/v1/tasks/{id}
PATCH  /api/v1/tasks/{id}
POST   /api/v1/tasks/{id}/complete
POST   /api/v1/tasks/{id}/restore
POST   /api/v1/tasks/{id}/archive
POST   /api/v1/tasks/{id}/quadrant
GET    /api/v1/tasks/reminders
GET    /api/v1/tasks/today
GET    /api/v1/tasks/inbox
GET    /api/v1/tasks/quadrants
```

**Service reuse**:

- `createTask`, `getTask`, `getTaskDetail`, `updateTask`, `completeTask`, `toggleTaskCompletion`
- `moveTaskToQuadrant`, `listTasksDueSoon`, `listOpenTodayDueTasks`, `listTasksForSource`
- `replaceTaskKeyResultLinks`, `getTaskLinkKeyResultIds`

**Data considerations**:

- Add or define archive semantics for tasks. If current `tasks.status` only supports active/done-style values, extend it or add a dedicated archive marker.
- Default list endpoints exclude archived tasks.

### Module: OKR Automation API

**Responsibilities**:

- Expose period, objective, key result, and check-in operations.
- Use archive status for delete semantics.
- Preserve current summary endpoint.

**Proposed endpoints**:

```text
GET    /api/v1/okr/current
GET    /api/v1/okr/periods
POST   /api/v1/okr/periods
GET    /api/v1/okr/periods/{id}
PATCH  /api/v1/okr/periods/{id}
POST   /api/v1/okr/periods/{id}/archive
GET    /api/v1/okr/periods/{id}/objectives
POST   /api/v1/okr/objectives
GET    /api/v1/okr/objectives/{id}
PATCH  /api/v1/okr/objectives/{id}
POST   /api/v1/okr/objectives/{id}/archive
POST   /api/v1/okr/key-results
GET    /api/v1/okr/key-results/{id}
PATCH  /api/v1/okr/key-results/{id}
POST   /api/v1/okr/key-results/{id}/archive
GET    /api/v1/okr/key-results/{id}/check-ins
POST   /api/v1/okr/key-results/{id}/check-ins
```

**Service reuse**:

- `listPeriods`, `getPeriod`, `createPeriod`, `updatePeriod`, `archivePeriod`
- `listObjectives`, `createObjective`, `updateObjective`
- `getKeyResult`, `getKeyResultDetail`, `createKeyResult`, `updateKeyResult`
- `createKrCheckIn`, `listKeyResultCheckIns`

**Data considerations**:

- Periods already support `active`/`archived`.
- Objectives already support `active`/`done`/`archived`.
- Key results already support `active`/`at_risk`/`done`/`archived`.

### Module: Review and Review Context API

**Responsibilities**:

- Expose review list/detail/create/update/finalize/archive operations.
- Provide Hermes with daily/weekly/monthly review context.
- Support explicit time ranges.

**Proposed endpoints**:

```text
GET    /api/v1/reviews
POST   /api/v1/reviews
GET    /api/v1/reviews/{id}
PATCH  /api/v1/reviews/{id}
POST   /api/v1/reviews/{id}/finalize
POST   /api/v1/reviews/{id}/archive
POST   /api/v1/reviews/weekly/draft
GET    /api/v1/reviews/context
```

**Review context query shape**:

```text
type=daily|weekly|monthly|period
start=YYYY-MM-DD
end=YYYY-MM-DD
```

If no query is provided, default to `type=daily` for the current local date.

**Service reuse**:

- `listReviews`, `getReview`, `saveReviewDraft`, `updateReviewDraftById`, `finalizeReview`
- `summarizeWeeklyInputs`, `listReviewHistoryByType`
- Task/OKR helpers used for context aggregation.

**Data considerations**:

- Add or define archive semantics for reviews. Current review status only covers `draft`/`final`, so archive needs either a new status value or a separate archive marker.
- Existing review type set includes `weekly`, `monthly`, `period`; daily context can be an API context type without necessarily creating a new stored review type unless implementation chooses to store daily reviews.

### Module: API Contract

**Responsibilities**:

- Keep `packages/api-contract/src/v1/openapi.ts` aligned with route handlers.
- Provide request and response schemas that are usable by CLI and Hermes.
- Avoid advertising `examples` as core business functionality.

**Changes**:

- Add paths for task, OKR, review, review context, and reminder candidate endpoints.
- Add schemas for task, task write input, OKR entities, check-ins, review, review context response, and common error responses.
- Keep current endpoints backward compatible.

### Module: Audit Logging

**Responsibilities**:

- Record automated writes without adding token scopes in MVP.
- Preserve enough metadata to distinguish API-driven operations.

**Changes**:

- Ensure mutations from route handlers insert `auditLogs` entries where current routes already do so.
- Use actor type/user ID consistently and add metadata such as route/action/source token name if available through existing auth context. If token name is not available from `getAuthUser`, keep the first iteration at user-level audit and avoid expanding auth shape unless needed.

### Module: Tests

**Responsibilities**:

- Verify route behavior, auth, validation, archive semantics, and contract coverage.

**Tests to add/update**:

- API route tests for task CRUD/archive/reminders.
- API route tests for OKR period/objective/key-result/check-in CRUD/archive.
- API route tests for review detail/finalize/archive/context.
- Service tests for any new archive helpers.
- OpenAPI tests for new paths and schemas.
- Regression tests that no-token requests return JSON 401 for protected APIs.

## Data Model

Detailed entity and state notes live in [data-model.md](data-model.md).

## Project Structure

Expected additions or updates:

```text
apps/web/src/app/api/v1/tasks/route.ts
apps/web/src/app/api/v1/tasks/[id]/route.ts
apps/web/src/app/api/v1/tasks/[id]/complete/route.ts
apps/web/src/app/api/v1/tasks/[id]/restore/route.ts
apps/web/src/app/api/v1/tasks/[id]/archive/route.ts
apps/web/src/app/api/v1/tasks/[id]/quadrant/route.ts
apps/web/src/app/api/v1/tasks/reminders/route.ts

apps/web/src/app/api/v1/okr/periods/route.ts
apps/web/src/app/api/v1/okr/periods/[id]/route.ts
apps/web/src/app/api/v1/okr/periods/[id]/archive/route.ts
apps/web/src/app/api/v1/okr/periods/[id]/objectives/route.ts
apps/web/src/app/api/v1/okr/objectives/route.ts
apps/web/src/app/api/v1/okr/objectives/[id]/route.ts
apps/web/src/app/api/v1/okr/objectives/[id]/archive/route.ts
apps/web/src/app/api/v1/okr/key-results/route.ts
apps/web/src/app/api/v1/okr/key-results/[id]/route.ts
apps/web/src/app/api/v1/okr/key-results/[id]/archive/route.ts
apps/web/src/app/api/v1/okr/key-results/[id]/check-ins/route.ts

apps/web/src/app/api/v1/reviews/[id]/finalize/route.ts
apps/web/src/app/api/v1/reviews/[id]/archive/route.ts
apps/web/src/app/api/v1/reviews/context/route.ts

packages/api-contract/src/v1/openapi.ts
packages/db/src/schema/sqlite.ts
packages/db/src/schema/postgres.ts
packages/db/src/migrations/*
```

The exact file count can be reduced during implementation if route grouping patterns make a smaller set clearer.

## Risks and Tradeoffs

- **Archive schema choice**: OKR entities already support archived status, but tasks and reviews may need schema changes. Extending status enums is compact, while adding `archivedAt` is clearer for history. The implementation should pick one consistent approach per entity and update both SQLite/Postgres.
- **Route surface size**: Full CRUD creates many route files. Keeping handlers thin and tests focused is important.
- **Review context aggregation**: Daily/weekly/monthly context touches task, OKR, and review services. Start with deterministic query aggregation, not LLM-specific formatting.
- **No idempotency**: Repeated client retries may duplicate create operations. This is accepted for MVP because both services run in NAS Docker and calls are user-controlled.
- **No token scopes**: Any valid API token can perform all exposed actions. This is accepted for personal use but should be revisited before broader exposure.

## Verification Strategy

- Run `pnpm test` for service and route coverage.
- Run `pnpm typecheck` after adding route handlers and contract schemas.
- Run `pnpm lint` for route and schema consistency.
- Run `pnpm build` or `pnpm check:ci` before deployment.
- Manually smoke test deployed NAS domain with:

```bash
curl -H "Authorization: Bearer $STRIDE_TOKEN" https://stride-os.mengpeng.tech/api/v1/me
curl -H "Authorization: Bearer $STRIDE_TOKEN" "https://stride-os.mengpeng.tech/api/v1/reviews/context?type=daily"
```

## Design Artifacts

- [spec.md](spec.md)
- [data-model.md](data-model.md)

## Notes

- `examples` routes remain available but should not be positioned as core business API.
- CLI program implementation is intentionally out of scope; the API should be sufficient for a CLI to call later.
- Hermes scheduling and notification behavior stays in Hermes, not Stride OS.

## Sources

| Decision | Source | Notes |
|----------|--------|-------|
| `/api/v1` route boundary | Local code: `apps/web/src/app/api/v1` | Existing app pattern |
| Bearer token auth | Local code: `apps/web/src/lib/auth/api-auth.ts` | Existing API auth path |
| Service reuse | Local code: `apps/web/src/lib/services/*` | Existing domain functions |
| Archive semantics | [spec.md](spec.md) | Clarified product decision |
| No scopes/batch/idempotency | [spec.md](spec.md) | Clarified MVP scope |
