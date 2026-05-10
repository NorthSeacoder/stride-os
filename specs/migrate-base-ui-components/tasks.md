# Tasks: Migrate Base UI Components

**Workspace**: `migrate-base-ui-components` | **Date**: 2026-05-10  
**Input**: `specs/migrate-base-ui-components/spec.md` + `plan.md`  
**Prerequisites**: spec.md, plan.md

---

## Execution Principles

- Keep changes inside `apps/web` for this migration.
- Replace all visible native `button`, `input`, `select`, and `textarea` callsites in app pages.
- Keep `input type="hidden"` native.
- Preserve server action `FormData` field names and React 19 form state patterns.
- Add display components only when they remove repeated presentation markup.

---

## Phase 1: UI Foundation

**Goal**: Build the reusable app UI surface before page migration.

- [x] T001 [US1, US2] Add a Base UI-backed `Button` and `LinkButton` wrapper.
  - scope: `apps/web/src/components/ui/button.tsx`, `apps/web/src/components/ui/index.ts`
  - details: support `variant`, `size`, `fullWidth`, `pending`, `className`; default non-submit buttons to `type="button"`; require explicit `type="submit"` at submit callsites.
  - verify: local typecheck for button props; confirm exported from UI index.

- [x] T002 [US1, US2] Harden existing field wrappers for complete page replacement.
  - scope: `apps/web/src/components/ui/form-controls.tsx`
  - details: make `TextField` and `TextareaField` pass through common HTML props; align label, description, error, disabled, required, placeholder, value/defaultValue behavior; keep `Field.Root` semantics.
  - verify: `TextField` can represent login email/password, numeric OKR fields, token name, and generic text inputs.

- [x] T003 [US1, US2] Extend `SelectField` for controlled and uncontrolled single-select use.
  - scope: `apps/web/src/components/ui/form-controls.tsx`
  - details: support `value`, `defaultValue`, `onValueChange`, hidden form value, placeholder, disabled, and app styling; preserve existing simple server-action use.
  - verify: can replace OKR period type, quarter/month selectors, quadrant selector, example status selector, KR confidence selector.

- [x] T004 [US1, US2] Resolve strict visible multi-select replacement.
  - scope: `apps/web/src/components/ui/form-controls.tsx`, current task form key result selector callsites
  - details: inspect existing visible multiple select usage; either add a Base UI-backed multi-select/project picker or remove the native multiple select callsite through an equivalent project UI component.
  - verify: search shows no visible `<select multiple>` outside allowed wrapper internals.

- [x] T005 [US1] Normalize existing Base UI wrappers without changing behavior.
  - scope: `apps/web/src/components/ui/date-picker-field.tsx`, `modal.tsx`, `toast.tsx`
  - details: align button variants, focus classes, tone names, close/cancel controls, and `className` escape hatches with new UI primitives.
  - verify: DatePicker, Modal, Toast still compile and keep existing interaction paths.

---

## Phase 2: Display Components

**Goal**: Create or refine display-only components used during page cleanup.

- [x] T006 [US1, US2] Consolidate alert and feedback display components.
  - scope: `apps/web/src/components/ui/error-alert.tsx`, `toast.tsx`, optional new `alert.tsx`, `index.ts`
  - details: provide consistent tone names for neutral/info/success/warning/danger; keep existing `ErrorAlert` and `FeedbackAlert` compatibility if useful.
  - verify: login/review/task examples can show action errors without inline alert markup.

- [x] T007 [US1, US2] Add compact status display helpers only where repeated.
  - scope: optional `apps/web/src/components/ui/badge.tsx`, `status-pill.tsx`, `panel.tsx`, `toolbar.tsx`, `section-header.tsx`, `index.ts`
  - details: introduce display components for repeated status pills, page headers, panel containers, and action toolbars; do not import Base UI unless interactive behavior is added.
  - verify: repeated page markup is reduced without nested card layouts.

---

## Phase 3: Low-Risk Page Migration

**Goal**: Replace straightforward controls before the large dashboard clients.

- [x] T008 [US1] Migrate login form controls.
  - scope: `apps/web/src/app/login/login-form.tsx`
  - details: replace visible inputs and submit button with UI wrappers; keep `useActionState`, `useFormStatus`, and action error behavior.
  - verify: login form payload names remain `email` and `password`; submit pending state still works.

- [x] T009 [US1] Migrate root, not-found, error, and dashboard layout actions.
  - scope: `apps/web/src/app/page.tsx`, `not-found.tsx`, `error.tsx`, `apps/web/src/app/(dashboard)/layout.tsx`
  - details: replace visible buttons/link-buttons; preserve navigation and logout form behavior.
  - verify: all links/forms still navigate or submit as before.

- [x] T010 [US1] Migrate settings token controls.
  - scope: `apps/web/src/app/(dashboard)/settings/tokens/tokens-client.tsx`
  - details: replace token name input and create/delete buttons; preserve `useActionState` and token deletion forms.
  - verify: create/delete token actions retain field names and submit behavior.

---

## Phase 4: Workflow Page Migration

**Goal**: Replace page-level visible native controls in core workflows.

- [x] T011 [US1, US2] Migrate examples page controls and display statuses.
  - scope: `apps/web/src/app/(dashboard)/examples/examples-client.tsx`
  - details: replace create/edit/delete buttons, form fields, status select, notes textarea, and inline error/status markup where covered by display components.
  - verify: create, edit, cancel, and delete flows still work; no visible native controls remain in file.

- [x] T012 [US1, US2] Migrate review page controls.
  - scope: `apps/web/src/app/(dashboard)/review/review-client.tsx`
  - details: replace date/text fields, textarea, generate/save buttons; keep hidden draft fields native.
  - verify: generate weekly draft and save draft payloads keep original names and JSON hidden field behavior.

- [x] T013 [US1, US2] Migrate OKR check-in form.
  - scope: `apps/web/src/app/(dashboard)/okr/[id]/check-in-form.tsx`
  - details: replace progress number input, confidence select, summary/blocker/next action textareas, submit button; keep hidden `keyResultId`.
  - verify: check-in action receives same fields and validation errors render through display alert.

- [x] T014 [US1, US2] Migrate OKR management client.
  - scope: `apps/web/src/app/(dashboard)/okr/okr-client.tsx`
  - details: replace period/objective/KR form inputs, selects, buttons, period date selectors, and repeated status/display pills as needed.
  - verify: create period/objective/key result flows still work; controlled period type/quarter/month/custom month state remains correct.

- [x] T015 [US1, US2] Migrate task client forms and action buttons.
  - scope: `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`
  - details: replace view buttons, modal form fields, status/priority/energy/today type selectors, key result selector, submit/cancel/delete/status buttons; keep hidden task IDs native.
  - verify: create/edit/status/delete flows work; modal keyboard/focus behavior remains intact.

- [x] T016 [US1, US2] Migrate quadrants client fallback controls.
  - scope: `apps/web/src/app/(dashboard)/quadrants/quadrants-client.tsx`
  - details: replace fallback quadrant select and submit buttons; keep dnd-kit drag/drop behavior unchanged.
  - verify: drag/drop still works; fallback form movement still submits correct quadrant.

---

## Phase 5: Enforcement and Verification

**Goal**: Prove the migration satisfies spec and does not regress behavior.

- [x] T017 [US2] Enforce single UI entrypoint usage.
  - scope: `apps/web/src/components/ui/index.ts`, all migrated app imports
  - details: ensure app pages import reusable controls from `@/components/ui`; avoid competing local button/input implementations.
  - verify: imports are consistent; no duplicate wrapper files outside UI directory.

- [x] T018 [US1, US2] Run native-control search audit.
  - scope: `apps/web/src/app`, `apps/web/src/components/ui`
  - details: run `rg -n "<button|<input|<select|<textarea" apps/web/src/app apps/web/src/components/ui`; classify remaining matches as hidden inputs or wrapper internals only.
  - verify: no visible direct native controls remain outside project UI wrappers.

- [x] T019 [US1, US2] Run static verification.
  - scope: workspace
  - details: run `pnpm lint`, `pnpm typecheck`, `pnpm test`.
  - verify: all commands pass or failures are documented with cause.

- [ ] T020 [US1] Perform manual workflow checks.
  - scope: web app in browser
  - details: check login, task create/edit/delete/status, OKR create/check-in, review generate/save, examples create/edit/delete, quadrants drag/drop plus fallback, token create/delete, keyboard traversal through forms/selects/modals.
  - verify: record any defects and fix before acceptance.

- [x] T021 [US1, US2] Update final acceptance notes.
  - scope: optional `specs/migrate-base-ui-components/acceptance.md`
  - details: summarize search audit, static checks, manual checks, and any intentionally retained native hidden inputs.
  - verify: acceptance notes map back to US1/US2 and FR-001 through FR-009.

---

## Dependencies and Order

- Critical path: T001 -> T002/T003/T004 -> T008 through T016 -> T018/T019/T020.
- T006/T007 can run after T001 and before or alongside page migration.
- T011 through T016 can be implemented one page at a time after the UI wrappers are ready.
- T018 should run after all page migrations and before final static/manual verification.

---

## Coverage Check

| Scenario / Requirement | Tasks |
|---|---|
| US1-1 basic interactions keep working | T001-T005, T008-T016, T020 |
| US1-2 keyboard/focus behavior | T001-T005, T015, T020 |
| US1-3 display semantics | T006-T007, T011-T014 |
| US1-4 validation errors | T002, T006, T008, T011-T015 |
| US1-5 pending/disabled/danger/empty states | T001, T006-T007, T008-T016 |
| US1-6 hidden fields/server actions | T002-T004, T008-T016, T018 |
| US2-1 reusable UI entrypoint | T001-T007, T017 |
| US2-2 API supports current use cases | T002-T005, T008-T016 |
| FR-006 no visible native controls | T008-T018 |
| NFR static verification | T019 |

---

## Notes

- If T004 reveals a complex multi-select replacement that cannot be kept small, stop and update `plan.md` before migrating task forms.
- Do not move components to `packages/ui` in this task set.
- Do not refactor server actions, database code, or domain models.
