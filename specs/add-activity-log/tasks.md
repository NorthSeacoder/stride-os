# Tasks: Activity Log Panel

**Workspace**: `add-activity-log` | **Date**: 2026-05-13  
**Input**: `specs/add-activity-log/spec.md` + `plan.md` + `data-model.md`  
**Prerequisites**: spec.md, plan.md, data-model.md

---

## Execution Principles

- Keep the existing OKR/task/review domain model intact.
- Route supported Web/API/CLI/agent writes through application service paths; do not attempt to capture arbitrary direct database writes.
- Add activity logging incrementally and keep existing auth/token audit records compatible.
- Prefer explicit service-layer activity context over decorators or base classes.
- Each phase should leave the project in a testable state.

## Phase 1: Storage Foundation

- [x] T001 Add activity display/query columns to `audit_logs` schemas.
  - scope: `packages/db/src/schema/sqlite.ts`, `packages/db/src/schema/postgres.ts`
  - details: add nullable `targetTitle`, `source`, and `summary` fields matching [data-model.md](data-model.md); keep existing fields unchanged.
  - verify: typecheck schema exports locally; confirm existing auth/token audit writes can still omit the new fields.
  - covers: FR-003, FR-005, FR-011, FR-012

- [x] T002 Add audit log indexes and migrations for both database modes.
  - scope: database migrations, `packages/db/src/schema/sqlite.ts`, `packages/db/src/schema/postgres.ts`
  - details: add indexes for `createdAt`, `(targetType, targetId, createdAt)`, `(actorType, actorId, createdAt)`, `(action, createdAt)`, and `(source, createdAt)`.
  - verify: run database migration path for SQLite; inspect generated/handwritten migration for PostgreSQL parity.
  - covers: FR-006, FR-007, FR-012, NFR-002

- [x] T003 Ensure schema index exports remain compatible.
  - scope: `packages/db/src/schema/index.ts`, `packages/db/src/__tests__/*`
  - details: confirm active schema export still exposes `auditLogs` and related relations; add or adjust a small schema smoke test if current coverage misses the new fields.
  - verify: run relevant db tests or `pnpm --filter @stride-os/db typecheck`.
  - covers: FR-011, FR-012

## Phase 2: Activity Service Core

- [x] T004 Create shared activity types and constants.
  - scope: `apps/web/src/lib/services/activity-service.ts`
  - details: define action/source/actor/target types, `ActivityContext`, `ActivityMetadata`, `ActivityQuery`, and display row return type aligned with [data-model.md](data-model.md).
  - verify: `pnpm typecheck` should accept consumers once added.
  - covers: FR-003, FR-014

- [x] T005 Implement `recordActivity` with metadata sanitization.
  - scope: `apps/web/src/lib/services/activity-service.ts`
  - details: insert into `schema.auditLogs`; reject or strip unsafe metadata keys; support null optional display fields for existing audit compatibility.
  - verify: add unit tests for insert shape and secret/payload sanitization.
  - covers: FR-003, FR-005, NFR-003, NFR-004

- [x] T006 Implement diff helpers for user-facing field changes.
  - scope: `apps/web/src/lib/services/activity-service.ts`, possible label helpers in `apps/web/src/lib/presentation/labels.ts`
  - details: produce `changedFields` and `diff` metadata for important fields such as status, due date, priority, list, current value, confidence, title, and review status.
  - verify: unit tests cover unchanged fields, null transitions, date values, and display-safe output.
  - covers: FR-004, US3, US4

- [x] T007 Implement `listActivity` query service.
  - scope: `apps/web/src/lib/services/activity-service.ts`
  - details: support time range, target type/id, actor type/id, source, action, keyword, changed field, cursor/limit; return reverse chronological display rows.
  - verify: unit tests cover each filter, pagination, and null display fields from legacy audit rows.
  - covers: FR-006, FR-007, FR-011, NFR-002

## Phase 3: Actor and Source Context

- [x] T008 Add request-to-activity context helpers.
  - scope: `apps/web/src/lib/auth/api-auth.ts`, `apps/web/src/app/api/_lib/audit.ts` or new helper under `apps/web/src/lib/services/activity-service.ts`
  - details: normalize session users as `source: web`; normalize bearer/API users as `source: api` unless trusted metadata indicates `cli`, `hermes`, or `agent`.
  - verify: add auth helper tests for session, API token, unknown source, and explicit trusted source cases.
  - covers: FR-009, FR-014, US2, US5

- [x] T009 Thread activity context through dashboard server actions.
  - scope: `apps/web/src/app/(dashboard)/tasks/actions.ts`, `okr/actions.ts`, `review/actions.ts`, `quadrants/actions.ts` if it mutates tasks
  - details: construct `ActivityContext` after `getSessionUser()` and pass it into domain service mutations; preserve existing validation and `revalidatePath` behavior.
  - verify: action tests assert service calls receive web context or activity appears after successful actions.
  - covers: US1, US5

- [x] T010 Thread activity context through API mutation routes.
  - scope: `apps/web/src/app/api/v1/tasks/**`, `okr/**`, `reviews/**`
  - details: after authentication, pass API/agent context into service mutations; do not infer Hermes from untrusted request headers alone.
  - verify: API route tests assert activity context for authenticated bearer calls and no successful activity on rejected requests.
  - covers: US2, US5, FR-010, FR-014

## Phase 4: Domain Mutation Activity

- [x] T011 Record task activity for create/update/complete/restore/archive.
  - scope: `apps/web/src/lib/services/task-service.ts`, `apps/web/src/__tests__/tasks/task-service.test.ts`
  - details: extend mutation signatures with optional activity context/options; read old task for updates; compute diff; record `task.*` actions only after successful mutations.
  - verify: tests cover create, update diff, complete, restore/toggle incomplete, archive, and failed validation without activity.
  - covers: FR-001, FR-003, FR-004, FR-010, US1, US3

- [x] T012 Record task movement and task-KR relationship activity.
  - scope: `apps/web/src/lib/services/task-service.ts`, task/KR link mutation paths
  - details: emit `task.move_list`, `task.move_quadrant`, `task.link_key_result`, and `task.unlink_key_result` where supported by current service/API paths.
  - verify: tests cover list/quadrant movement and KR link/unlink activity with target context.
  - covers: FR-001, FR-005, US3

- [x] T013 Record OKR period/objective/key result activity.
  - scope: `apps/web/src/lib/services/okr-service.ts`, `apps/web/src/__tests__/okr/okr-service.test.ts`
  - details: emit `okr.period.*`, `okr.objective.*`, and `okr.key_result.*` actions with title snapshots and field diffs.
  - verify: tests cover create/update/archive for period/objective and create/update for key result.
  - covers: FR-002, FR-003, FR-004, US4

- [x] T014 Record KR check-in activity transactionally.
  - scope: `apps/web/src/lib/services/okr-service.ts`
  - details: record `okr.key_result.check_in` in the same success path as check-in insert and key result progress/confidence update.
  - verify: tests assert check-in creates activity with progress/confidence diff and failed check-in does not.
  - covers: FR-002, FR-004, FR-010, US4

- [x] T015 Record Review lifecycle activity.
  - scope: `apps/web/src/lib/services/review-service.ts`, `apps/web/src/__tests__/review/review-service.test.ts`
  - details: emit `review.draft.create`, `review.draft.update`, `review.finalize`, and `review.archive`; avoid logging reads or editor keystrokes.
  - verify: tests cover draft create/update distinction, finalize, archive, and no successful activity on failed operations.
  - covers: FR-013, US6

## Phase 5: Activity API

- [x] T016 Add `GET /api/v1/activity` route.
  - scope: `apps/web/src/app/api/v1/activity/route.ts`, route validation helpers
  - details: parse filters from query params, authenticate with existing session/bearer flow, call `listActivity`, and return paginated JSON.
  - verify: API tests cover auth, default listing, each major filter, cursor/limit validation, and empty results.
  - covers: FR-006, FR-007, US1, US2, US3

- [x] T017 Update OpenAPI/API contract for activity.
  - scope: `packages/api-contract/src/index.ts`, `packages/api-contract/src/v1/openapi.ts`, `packages/api-contract/src/__tests__/openapi.test.ts`
  - details: document activity list endpoint, query params, row schema, source/action enums, and pagination shape.
  - verify: run API contract tests and typecheck.
  - covers: NFR-004, US5

## Phase 6: Activity UI

- [x] T018 Add global Activity dashboard route and navigation entry.
  - scope: `apps/web/src/app/(dashboard)/activity/page.tsx`, `dashboard-shell-nav.tsx` or `dashboard-shell-sidebar.tsx`
  - details: add authenticated page that loads recent activity through the service/API boundary and exposes filter controls.
  - verify: manually load `/activity`; existing dashboard navigation still renders.
  - covers: FR-007, US1

- [x] T019 Build reusable activity list, filter, and row components.
  - scope: `apps/web/src/components/activity/activity-list.tsx`, `activity-filters.tsx`, `activity-row.tsx`
  - details: implement dense list UI with timestamp, actor/source badge, action label, target title, summary, empty/loading/error states, and expandable diff details.
  - verify: component or page tests cover empty/list/diff-expanded states; visual check for text overflow and compact layout.
  - covers: FR-007, FR-009, NFR-006, US1, US2

- [x] T020 Add target-specific history embedding where current detail views support it.
  - scope: task detail/detail column if present, `apps/web/src/app/(dashboard)/okr/[id]/page.tsx`, review detail surfaces as applicable
  - details: reuse activity list with target filters for task/objective/key result/review contexts; avoid large UI rewrites if a detail surface is not yet available.
  - verify: manually inspect a task/KR/review after making changes and confirm scoped history rows.
  - covers: FR-008, US3, US4, US6

- [x] T021 Revalidate activity surfaces after web mutations.
  - scope: dashboard server actions in task/OKR/review/quadrants modules
  - details: add `revalidatePath('/activity')` and target page revalidation where existing actions already revalidate related pages.
  - verify: action tests or manual mutation verify the activity page updates after navigation/refresh.
  - covers: FR-007, US1

## Phase 7: End-to-End Verification and Cleanup

- [x] T022 Add integration coverage for complete web/API activity flows.
  - scope: `apps/web/src/__tests__/activity/*`, existing API/action/service test suites
  - details: cover a representative flow: create task, update task, complete task, KR check-in, save/finalize review, then query activity globally and by target.
  - verify: `pnpm test` passes.
  - covers: Success Criteria, FR-001, FR-002, FR-006, FR-013

- [x] T023 Verify both database modes at the schema/migration level.
  - scope: db migration scripts/configs and schema tests
  - details: ensure SQLite setup/migration works and PostgreSQL schema generation/migration remains valid according to existing project commands.
  - verify: run `pnpm db:setup` for SQLite if safe in the local environment; run schema generation/migration checks available in the repo.
  - covers: FR-012

- [x] T024 Run release-quality checks and document manual acceptance.
  - scope: whole repo, optional `specs/add-activity-log/acceptance.md`
  - details: run lint, typecheck, test, and build/check command; record any environment limitations and manual verification outcomes.
  - verify: `pnpm check:ci` or equivalent individual commands complete, or blockers are documented.
  - covers: NFR-001 through NFR-006

## Dependencies and Order

```text
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6 -> Phase 7
```

- T001-T003 are prerequisites for any persisted activity records.
- T004-T007 should land before domain services emit activity.
- T008-T010 should land before Web/API mutations are considered agent-aware.
- T011-T015 can be implemented by domain area after the activity service exists.
- T016-T017 require `listActivity`.
- T018-T021 require the query service and preferably the API contract.
- T022-T024 close the feature and should not be skipped.

## Coverage Check

- US1 recent activity: T007, T016, T018, T019, T021, T022
- US2 agent review: T008, T010, T016, T019, T022
- US3 target history: T007, T011, T012, T016, T020, T022
- US4 KR progress trace: T013, T014, T020, T022
- US5 CLI/API path: T008, T010, T016, T017
- US6 Review changes: T015, T020, T022
- Database compatibility: T001, T002, T003, T023
- Verification and release readiness: T022, T023, T024

## Notes

- If implementation finds changed-field filtering through JSON is brittle across SQLite/PostgreSQL, promote a queryable `changedFields` text column and update [data-model.md](data-model.md) before proceeding.
- If a current UI surface lacks a stable detail panel for target history, implement the reusable scoped history component and attach it only where the target context exists without a layout rewrite.
- Do not backfill existing auth/token rows unless implementation needs it for display safety.
