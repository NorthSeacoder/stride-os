# Acceptance: Migrate Base UI Components

**Workspace**: `migrate-base-ui-components`  
**Date**: 2026-05-10

---

## Summary

The implementation scope for Base UI migration is complete. All planned app surfaces now use project UI wrappers for visible interactive controls. Remaining native controls are limited to allowed hidden inputs and wrapper internals.

---

## Search Audit

Command:

```text
rg -n "<button|<input|<select|<textarea" apps/web/src/app apps/web/src/components/ui
```

Result:

- `apps/web/src/components/ui/form-controls.tsx` still contains wrapper internals:
  - one visible `textarea` implementation inside `TextareaField`
  - hidden inputs used for form serialization
- `apps/web/src/components/ui/date-picker-field.tsx` contains a hidden input for form serialization
- app routes only retain native `input type="hidden"` for server action payloads:
  - task id
  - key result id
  - review draft payload fields
  - OKR period/objective/date expansion fields
  - example item id

Conclusion:

- FR-006 satisfied
- no visible direct native `button`, `input`, `select`, or `textarea` remain in app pages

---

## Static Verification

Commands run:

```text
pnpm lint
pnpm typecheck
pnpm test
```

Results:

- `pnpm lint`: passed
- `pnpm typecheck`: passed
- `pnpm test`: passed
- Vitest summary: 14 test files passed, 44 tests passed

Notes:

- test run applied sqlite migrations and seed successfully before executing suite

---

## Requirement Coverage

- `FR-001`: visible interactive controls now route through Base UI-backed project wrappers
- `FR-002`: server action field names and form semantics preserved
- `FR-003`: page-local repeated native control styling removed in migrated surfaces
- `FR-004`: existing theme variables preserved
- `FR-005`: focus, label, error, dialog, select, and checkbox behavior now centralized in shared wrappers
- `FR-006`: only hidden inputs remain native in app pages
- `FR-007`: app pages consume `@/components/ui` as the shared entrypoint
- `FR-008`: migration stayed inside `apps/web/src/components/ui`
- `FR-009`: display components remain project-owned (`Empty`, `ErrorAlert`, `FeedbackAlert`, `Badge`)

---

## Manual Verification Status

Not completed in this run:

- login submit and validation
- task create/edit/delete/status flows
- OKR create/check-in flows
- review generate/save/finalize flow
- examples create/edit/delete flow
- quadrants drag/drop and fallback move flow
- token create/delete flow
- keyboard traversal across forms, modals, and selects

These checks remain the last open acceptance item.
