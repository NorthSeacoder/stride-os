# Implementation Plan: Activity Log Panel

**Workspace**: `add-activity-log` | **Date**: 2026-05-13 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/add-activity-log/spec.md`

---

## Summary

Add a first-release Activity Log by extending the existing `audit_logs` capability into a domain-facing operation history for OKR, task, and key Review changes. The plan keeps the existing OKR/task model intact, routes supported web/API/CLI/agent mutations through service-level audit helpers, and adds a dense dashboard panel plus reusable target history list.

## Stack Detected

- Next.js `^16` from `apps/web/package.json`
- React `^19` / React DOM `^19` from `apps/web/package.json`
- TypeScript `^5` from workspace packages
- Drizzle ORM `^0.45` from `apps/web/package.json` and `packages/db/package.json`
- SQLite local mode through `better-sqlite3 ^11.10.0`
- Vitest `^4.1.5` from root `package.json`

## Architecture Overview

Current code already has an `audit_logs` table and writes auth/token events from `apps/web/src/lib/auth/session.ts` and `apps/web/src/lib/auth/pat.ts`. Domain writes are concentrated in:

- `apps/web/src/lib/services/task-service.ts`
- `apps/web/src/lib/services/okr-service.ts`
- `apps/web/src/lib/services/review-service.ts`
- dashboard server actions under `apps/web/src/app/(dashboard)/**/actions.ts`
- API routes under `apps/web/src/app/api/**`

The Activity Log should sit behind a new service boundary:

```text
Web UI Server Actions / API Routes / future CLI
  -> domain service mutation with ActivityContext
  -> mutation transaction
  -> record activity for successful changes
  -> revalidate affected UI paths where relevant

Activity panel / target history
  -> activity service query
  -> compact list rows with expandable diff metadata
```

Direct database writes outside official application/API/CLI paths remain outside scope.

## Key Design Decisions

### Decision 1: Extend `audit_logs` instead of adding a parallel activity table

- **Background**: The repo already has `audit_logs` in both SQLite and PostgreSQL schemas, and auth/token flows already use it.
- **Options**:
  - A: Extend `audit_logs` with domain-display columns and indexes — lowest migration and conceptual cost.
  - B: Add a separate `activity_logs` table — cleaner naming but duplicates actor/action/target concepts.
- **Conclusion**: Choose A. Keep one operation log table and make it useful for both audit and activity display.
- **Impact**: Existing auth/token records remain compatible; domain records gain richer display/query fields.
- **Source**: https://orm.drizzle.team/docs/indexes-constraints

### Decision 2: Promote common query/display fields to columns, keep diff details in metadata

- **Background**: The spec requires source filtering, keyword search, target history, and changed-field review. Keeping everything in JSON would make cross-database querying awkward.
- **Options**:
  - A: Add columns such as `source`, `summary`, `targetTitle`, and indexed paths for common queries; keep `metadata.diff` and `metadata.changedFields` for detail.
  - B: Store all new fields in `metadata` only.
- **Conclusion**: Choose A. It preserves the existing table while making the common panel queries straightforward in SQLite and PostgreSQL.
- **Impact**: Requires schema and migration updates in both database modes; avoids JSON-specific query differences for the main filters.
- **Source**: https://orm.drizzle.team/docs/indexes-constraints

### Decision 3: Record activity in service-layer mutation helpers, not decorators or UI-only handlers

- **Background**: OKR/task/review mutations already converge in service files. Server actions and route handlers are only entry points and should pass actor/source context downward.
- **Options**:
  - A: Add explicit `ActivityContext` and `recordActivity` calls in domain services.
  - B: Use decorators/base classes around service functions.
  - C: Log only in UI actions and API routes.
- **Conclusion**: Choose A. It is explicit, testable, and covers future CLI/API callers as long as they use the official service/API path.
- **Impact**: Service function signatures need a small optional context/options extension. Direct DB writes stay unsupported by design.
- **Source**: UNVERIFIED — repository architecture decision based on current service boundaries.

### Decision 4: Keep activity writes transactionally coupled to successful domain mutations where consistency matters

- **Background**: Failed operations must not create successful activity. Some existing flows already use Drizzle transactions, such as KR check-ins and review draft snapshots.
- **Options**:
  - A: Write domain mutation and activity in the same transaction when the domain mutation already needs or can reasonably use one.
  - B: Fire-and-forget activity after mutation.
- **Conclusion**: Choose A for create/update/check-in/finalize/archive flows where a missing activity row would be misleading. For display-only failures, do not affect existing read flows.
- **Impact**: Some simple mutations will need a transaction wrapper to read old state, write new state, and insert activity consistently.
- **Source**: https://orm.drizzle.team/docs/transactions

### Decision 5: Use Next Route Handlers and Server Actions as actor/source capture boundaries

- **Background**: Existing dashboard mutations use Server Actions with `revalidatePath`, and API routes use App Router route handlers plus bearer/session auth.
- **Options**:
  - A: Keep current Next App Router entry patterns and pass normalized `ActivityContext` into services.
  - B: Create a new RPC layer before adding activity.
- **Conclusion**: Choose A. It matches the current code and avoids a routing rewrite.
- **Impact**: Server actions identify `source: "web"` and session user; API routes identify `source: "api"` or `source: "hermes"/"agent"` when request metadata says so.
- **Source**: https://nextjs.org/docs/app/getting-started/mutating-data, https://nextjs.org/docs/app/getting-started/route-handlers

### Decision 6: Revalidate activity surfaces after mutations that can affect visible logs

- **Background**: Existing server actions already call `revalidatePath` for dashboard/task pages after domain mutations.
- **Options**:
  - A: Add activity page/detail paths to existing revalidation points.
  - B: Depend only on next navigation and no explicit invalidation.
- **Conclusion**: Choose A for server actions that mutate visible data. API route behavior can mark paths for revalidation as needed.
- **Impact**: Activity panel is less likely to show stale data after a web mutation.
- **Source**: https://nextjs.org/docs/app/api-reference/functions/revalidatePath

## Module Design

### Module: Database Schema

**Responsibilities**: Store activity records in both SQLite and PostgreSQL modes with queryable fields for common filters.

**Change Overview**:

- Extend `audit_logs` in `packages/db/src/schema/sqlite.ts` and `packages/db/src/schema/postgres.ts`.
- Add indexes for reverse chronological listing, target history, actor history, action filtering, and source filtering.
- Keep `metadata` as JSON for structured diff and non-query-critical context.

**Key Behavior**:

```text
audit_logs
  actorType / actorId
  action
  targetType / targetId / targetTitle
  source
  summary
  metadata.diff / metadata.changedFields / metadata.requestId / metadata.command
  createdAt
```

**Notes**:

- Auth/token rows can leave new display columns null.
- No retention cleanup is required in the first release.
- SQLite and PostgreSQL schema files must remain aligned.

### Module: Activity Service

**Responsibilities**: Provide one domain-safe API for recording and querying activity.

**Change Overview**:

- Add a service such as `apps/web/src/lib/services/activity-service.ts`.
- Define shared types for `ActivityActor`, `ActivitySource`, `ActivityTarget`, `ActivityMetadata`, and `ActivityQuery`.
- Provide `recordActivity`, `recordActivityFromDiff`, and `listActivity`.
- Provide helpers to sanitize metadata and avoid secrets.

**Key Behavior**:

```text
recordActivity(input)
  validate action, actor, target, source
  sanitize metadata
  insert audit_logs row

listActivity(query)
  apply time, target, actor, action, source filters
  apply keyword filter over summary/targetTitle/display-safe metadata where practical
  paginate by createdAt + id
  return display-ready rows
```

**Notes**:

- Changed-field filtering may use `metadata.changedFields`; if cross-database JSON filtering becomes too costly, plan implementation should either add a queryable text field or filter within a bounded result window.
- Activity write failure policy should be explicit in implementation. For successful domain mutations, the preferred behavior is transactionally consistent writes.

### Module: Actor and Source Context

**Responsibilities**: Normalize who initiated a change and through which supported path.

**Change Overview**:

- Add a small `ActivityContext` shape accepted by domain mutation services.
- Server actions construct context from `getSessionUser()` as `actorType: "user"`, `source: "web"`.
- API routes construct context from `authenticateApiRequest()` / bearer token validation as `source: "api"` by default, with explicit request metadata allowed for `hermes`, `agent`, or `cli`.
- Future official CLI should call API or shared application services and pass `source: "cli"` plus agent labels.

**Key Behavior**:

```text
ActivityContext:
  actorType: user | api_token | agent | system
  actorId?: string
  actorLabel?: string
  source: web | api | cli | hermes | agent | system | unknown
  requestId?: string
  command?: string
```

**Notes**:

- Do not infer Hermes from arbitrary user-agent strings alone.
- Unknown source should be explicit when source cannot be trusted.

### Module: Domain Mutation Integration

**Responsibilities**: Emit activity for OKR/task/review changes without rebuilding domain models.

**Change Overview**:

- Extend core mutation functions in `task-service.ts`, `okr-service.ts`, and `review-service.ts` with optional activity context/options.
- For updates, read old state, compute user-facing field diff, write mutation, and record activity.
- Preserve existing return shapes.

**Initial Coverage**:

- Task: create, update, complete, restore/toggle incomplete, archive, quadrant/list movement, task-KR link/unlink.
- OKR: period create/update/archive, objective create/update/archive, key result create/update, KR check-in.
- Review: draft create/update, finalize, archive.

**Notes**:

- Avoid logging read-only operations.
- Avoid logging every editor keystroke; record committed draft saves.
- Failed operations should not write successful activity.

### Module: Activity API

**Responsibilities**: Provide agent- and UI-consumable query access to activity records.

**Change Overview**:

- Add route handlers under `apps/web/src/app/api/v1/activity/route.ts`.
- Optionally add target-specific routes or support target query params in the same route.
- Update `packages/api-contract/src/index.ts` with the activity query response contract.

**Key Behavior**:

```text
GET /api/v1/activity
  query: time range, target, actor, action, source, keyword, changedField, cursor/limit
  auth: same session/bearer model as existing API
  response: paginated activity rows
```

**Notes**:

- Mutation APIs do not need to be rebuilt, but they must pass activity context to services.
- Route Handlers are the right App Router primitive for custom API endpoints.

### Module: Activity UI

**Responsibilities**: Show a compact operation history for global and target-specific review.

**Change Overview**:

- Add a dashboard route such as `apps/web/src/app/(dashboard)/activity/page.tsx`.
- Add reusable components in `apps/web/src/components/activity/`.
- Embed target-specific history in task/KR/review details where current UI structure supports it.

**Display Behavior**:

```text
Global panel:
  filters + paginated timeline/list
  timestamp, actor/source badge, action, target title, summary
  expandable diff rows

Target history:
  same row renderer
  target filter pre-applied
```

**Notes**:

- Use dense operational UI. No marketing timeline treatment.
- Agent-originated records need an explicit badge/icon treatment.
- Handle loading, empty, and error states.

## Data Model

Detailed storage shape is captured in [data-model.md](data-model.md). The important design point is that `audit_logs` remains the canonical table, with promoted fields for common filters and JSON metadata for diff/context detail.

## Project Structure

```text
packages/db/src/schema/
├── [modify] sqlite.ts
└── [modify] postgres.ts

packages/db/
└── [add] migrations for SQLite/PostgreSQL audit log column/index updates

apps/web/src/lib/services/
├── [add] activity-service.ts
├── [modify] task-service.ts
├── [modify] okr-service.ts
└── [modify] review-service.ts

apps/web/src/lib/auth/
├── [modify] api-auth.ts
└── [modify] pat.ts as needed to expose token actor context safely

apps/web/src/app/api/v1/activity/
└── [add] route.ts

apps/web/src/app/(dashboard)/activity/
└── [add] page.tsx

apps/web/src/components/activity/
├── [add] activity-list.tsx
├── [add] activity-filters.tsx
└── [add] activity-row.tsx

packages/api-contract/src/
└── [modify] index.ts

apps/web/src/__tests__/
├── [add/modify] activity/*
├── [modify] tasks/*
├── [modify] okr/*
└── [modify] review/*
```

## Risks and Tradeoffs

- **Schema compatibility**: Two schema files and migration paths must stay in sync for SQLite and PostgreSQL.
- **Diff quality**: Useful activity depends on mapping technical fields into user-facing labels. Over-logging raw data would reduce readability and may expose sensitive payloads.
- **Service signature spread**: Passing optional activity context touches multiple mutation call sites, but keeps the integration explicit and testable.
- **JSON filtering**: Changed-field filtering through metadata can become awkward across SQLite/PostgreSQL. If tests show it is too brittle, promote a queryable `changedFields` text column during implementation.
- **Activity write failures**: Coupling activity writes transactionally improves audit correctness but can cause a domain mutation to fail if activity insertion fails. Implementation should decide this per mutation class and test the chosen behavior.

## Verification Strategy

- Unit test `activity-service` insertion, sanitization, query filters, pagination, and display row mapping.
- Extend task service tests to assert activity for create/update/complete/archive/list movement and no activity on failed validation.
- Extend OKR service tests to assert activity for objective/KR updates and KR check-ins.
- Extend review service tests to assert draft save/finalize/archive activity.
- Add API route tests for `GET /api/v1/activity` filters and authentication.
- Add UI/component tests for empty/loading/error/list/diff expansion states where current test setup supports them.
- Run `pnpm lint`, `pnpm typecheck`, and `pnpm test`; use `pnpm check:ci` before release.
- Manual verification: create/update/complete a task, create a KR check-in, save/finalize a review, then confirm `/activity` and target history show expected records.

## Design Artifacts

| Artifact | Needed | Notes |
|----------|--------|-------|
| plan.md | Yes | Main implementation plan |
| data-model.md | Yes | Storage and activity metadata shape |
| tasks.md | Later | Produced by `tasks` stage |
| acceptance.md | Later | Useful for final verification |

## Notes

- The plan intentionally does not attempt to capture arbitrary direct database writes.
- The official CLI path should either call the API or share the application service layer so it can provide `ActivityContext`.
- Existing auth/token audit rows should not be backfilled unless a later migration explicitly needs display metadata.

## Sources

| Decision | Source URL | Notes |
|----------|------------|-------|
| Extend/index Drizzle schema | https://orm.drizzle.team/docs/indexes-constraints | Index and constraint support for SQLite/PostgreSQL schema definitions |
| Transactional activity writes | https://orm.drizzle.team/docs/transactions | Drizzle transaction API |
| Route Handler API | https://nextjs.org/docs/app/getting-started/route-handlers | App Router API endpoint pattern |
| Server Actions / mutations | https://nextjs.org/docs/app/getting-started/mutating-data | Server mutation and auth guidance |
| Cache revalidation | https://nextjs.org/docs/app/api-reference/functions/revalidatePath | Revalidate affected pages after mutations |
| Service-layer audit integration | UNVERIFIED | Repo-specific architecture decision based on existing service boundaries |
