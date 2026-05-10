# Implementation Plan: Migrate Base UI Components

**Workspace**: `migrate-base-ui-components` | **Date**: 2026-05-10 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/migrate-base-ui-components/spec.md`

---

## Stack Detected

- Next.js 16.2.4, App Router (`apps/web/package.json`, `pnpm-lock.yaml`)
- React 19.2.5 and React DOM 19.2.5 (`pnpm-lock.yaml`)
- Base UI React 1.4.1 (`apps/web/package.json`, `pnpm-lock.yaml`)
- Tailwind CSS 4.x (`apps/web/package.json`)
- TypeScript 5.9.3 (`pnpm-lock.yaml`)
- Vitest 4.1.5 (`package.json`)

---

## Summary

Migrate all visible interactive controls in `apps/web` to project UI wrappers backed by Base UI, while keeping hidden form inputs and server action payloads intact. Display-only components stay project-owned display components, not Base UI primitives.

---

## Architecture Overview

Current state:

- `apps/web/src/components/ui` already wraps Base UI for Modal, Toast, DatePicker, Select, Checkbox, and Field-backed text input.
- `apps/web/src/app` still contains direct visible `button`, `input`, `select`, and `textarea` usage across login, dashboard layout, tasks, OKR, review, examples, quadrants, tokens, error, and not-found/root pages.
- `packages/ui` is effectively empty and not used by the web app.

Target shape:

```text
apps/web/src/components/ui/
├── interaction primitives
│   ├── Button, LinkButton
│   ├── TextField, TextareaField
│   ├── SelectField
│   ├── CheckboxField
│   ├── Modal
│   ├── DatePickerField
│   └── ToastProvider / useToast
├── display components
│   ├── Empty
│   ├── Loading
│   ├── ErrorAlert / FeedbackAlert
│   ├── Badge / StatusPill
│   ├── Panel
│   ├── Toolbar
│   └── SectionHeader
└── index.ts as the only app UI export surface
```

Data flow remains unchanged: server actions still receive native `FormData`; React 19 `useActionState` remains the state bridge for action results; `useFormStatus` remains the local pending-state source for submit controls.

---

## Key Design Decisions

### Decision 1: Keep UI wrappers in `apps/web/src/components/ui`

- **Background**: The spec resolved that first-round migration should not move components into `packages/ui`.
- **Options**:
  - A: Keep wrappers in `apps/web/src/components/ui` — lower churn, matches current imports.
  - B: Move wrappers into `packages/ui` — cleaner long-term sharing, but adds package API and client-boundary concerns before there is another consumer.
- **Conclusion**: Use A for this migration.
- **Impact**: Page rewrites can stay local to `apps/web`; `packages/ui` remains unchanged.
- **Source**: Project decision from [spec.md](spec.md); Next client-boundary guidance from https://nextjs.org/docs/app/getting-started/server-and-client-components

### Decision 2: Use Base UI only for interactive primitives

- **Background**: Base UI provides headless interaction primitives. Display states like Empty, Loading, Alert, Badge, Panel, Toolbar, and SectionHeader do not need Base UI behavior.
- **Options**:
  - A: Base UI-backed wrappers for interactive controls; project display components for presentation.
  - B: Force all components through Base UI even when no behavior is needed.
- **Conclusion**: Use A.
- **Impact**: Better a11y and keyboard behavior where it matters, without fake dependencies for static UI.
- **Source**: https://base-ui.com/react/components/button, https://base-ui.com/react/components/field, https://base-ui.com/react/components/select, https://base-ui.com/react/components/checkbox

### Decision 3: Preserve React 19 form action patterns

- **Background**: Existing forms already use `useActionState` and `useFormStatus`.
- **Options**:
  - A: Preserve these patterns and make UI wrappers compatible with native form props.
  - B: Replace form state management while migrating UI.
- **Conclusion**: Use A.
- **Impact**: Migration stays UI-focused; server actions and form payloads remain stable.
- **Source**: https://react.dev/reference/react/useActionState, https://react.dev/reference/react-dom/hooks/useFormStatus

### Decision 4: Hidden inputs remain native

- **Background**: Hidden inputs are payload plumbing, not visible interaction controls.
- **Options**:
  - A: Keep `input type="hidden"` as native elements.
  - B: Wrap hidden fields in project UI components.
- **Conclusion**: Use A.
- **Impact**: Server action payload compatibility remains explicit and simple.
- **Source**: Spec requirement FR-006 in [spec.md](spec.md)

### Decision 5: Keep client components narrow

- **Background**: Base UI wrappers with events, state, portals, or browser interaction need client components, but static display components do not.
- **Options**:
  - A: Mark only interactive wrappers and pages already using hooks as client.
  - B: Mark broad UI barrels or layouts as client.
- **Conclusion**: Use A.
- **Impact**: Avoids expanding the client bundle and preserves App Router server component defaults.
- **Source**: https://nextjs.org/docs/app/getting-started/server-and-client-components

---

## Module Design

### Module: Interaction UI Wrappers

**Responsibilities**: Provide Base UI-backed controls with consistent Stride OS styling, form semantics, focus states, disabled states, and variants.

**Change overview**:

- Add or complete `Button` and `LinkButton` wrappers around `@base-ui/react/button`.
- Extend existing form controls so `TextField`, `TextareaField`, `SelectField`, and `CheckboxField` can replace current page-level native controls.
- Make `SelectField` support controlled value changes needed by OKR period fields and quadrants.
- Keep `DatePickerField`, `Modal`, and Toast as existing Base UI wrappers, tightening API consistency only where needed.

**Key behavior**:

```text
Button
- variants: primary, secondary, ghost, danger, success
- sizes: sm, md, full-width support through className
- must pass type explicitly; submit buttons use type="submit"
- supports disabled and pending visual states

Field wrappers
- accept name, label, description, error
- pass through required, disabled, defaultValue, value, onChange where needed
- preserve server action FormData names

SelectField
- supports uncontrolled server-action forms
- supports controlled value/onValueChange for client state forms
- supports single-select first; strict replacement of visible select callsites may require a multi-select variant if an existing visible multi-select remains
```

**Notes**:

- Base UI Button does not submit by default; submit wrappers must specify `type="submit"`.
- Base UI Checkbox renders a hidden input for form integration; do not duplicate checked payloads unless a server action requires an unchecked value.

### Module: Display Components

**Responsibilities**: Provide static or mostly static presentation elements that share theme variables and layout conventions.

**Change overview**:

- Keep `Empty`, `Loading`, `ErrorAlert`, and `FeedbackAlert` as display components.
- Add `Badge`, `StatusPill`, `Panel`, `Toolbar`, and `SectionHeader` only where they remove repeated page markup during migration.
- Do not import Base UI in display-only components unless they gain real interaction.

**Key behavior**:

```text
Alert
- tone: neutral, info, success, warning, danger
- consistent border/background/text variables

Badge / StatusPill
- used for status, priority, confidence, period type
- compact, non-interactive by default

Panel / Toolbar / SectionHeader
- reduce repeated page scaffolding
- avoid nested cards
```

### Module: Business Pages

**Responsibilities**: Consume project UI wrappers instead of direct visible native controls.

**Change overview**:

- Replace visible direct `button`, `input`, `select`, and `textarea` in `apps/web/src/app`.
- Keep hidden inputs native.
- Preserve all server action `name` values, default values, controlled state updates, and submit/cancel behavior.

**Primary affected surfaces**:

- `apps/web/src/app/login/login-form.tsx`
- `apps/web/src/app/error.tsx`
- `apps/web/src/app/not-found.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/(dashboard)/layout.tsx`
- `apps/web/src/app/(dashboard)/tasks/tasks-client.tsx`
- `apps/web/src/app/(dashboard)/okr/okr-client.tsx`
- `apps/web/src/app/(dashboard)/okr/[id]/check-in-form.tsx`
- `apps/web/src/app/(dashboard)/review/review-client.tsx`
- `apps/web/src/app/(dashboard)/examples/examples-client.tsx`
- `apps/web/src/app/(dashboard)/quadrants/quadrants-client.tsx`
- `apps/web/src/app/(dashboard)/settings/tokens/tokens-client.tsx`

---

## Data Model

No domain data model changes. No database changes. No server action contract changes except preserving exact `FormData` field names through wrapper components.

No `data-model.md` needed.

---

## Project Structure

```text
apps/web/src/components/ui/
├── [modify] index.ts
├── [modify] form-controls.tsx
├── [modify] date-picker-field.tsx
├── [modify] modal.tsx
├── [modify] toast.tsx
├── [add] button.tsx
└── [add as needed] display helpers: badge.tsx, panel.tsx, toolbar.tsx, section-header.tsx

apps/web/src/app/
├── [modify] page.tsx
├── [modify] error.tsx
├── [modify] not-found.tsx
├── [modify] login/login-form.tsx
└── [modify] (dashboard)/**/*

specs/migrate-base-ui-components/
├── [existing] spec.md
└── [add] plan.md
```

---

## Risks and Tradeoffs

- **Form payload regression**: Wrapper props may accidentally drop `name`, `value`, `defaultValue`, or hidden payload fields. Mitigation: inspect each server action form and verify submitted names stay identical.
- **Submit behavior regression**: Base UI Button requires explicit `type="submit"` for submit buttons. Mitigation: default app `Button` to `type="button"` and force submit callsites to be explicit.
- **Client bundle growth**: A broad UI barrel can pull client components into server components. Mitigation: keep `"use client"` only in files that need it; avoid importing client-only wrappers into static display-only components.
- **Controlled Select complexity**: OKR period/month fields and quadrant changes need `value` + `onValueChange`. Mitigation: make `SelectField` support both controlled and uncontrolled modes before page migration.
- **Multi-select replacement**: Existing `SelectField` keeps native multiple select fallback. The spec now asks for strict visible native select replacement, so implementation must either add a Base UI multi-select wrapper or confirm no visible multi-select remains after page migration.
- **Visual drift**: Page-level class names encode many variants. Mitigation: introduce variants only for repeated patterns and keep `className` escape hatch.

---

## Verification Strategy

- Static checks:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
- Search checks:
  - `rg -n "<button|<input|<select|<textarea" apps/web/src/app apps/web/src/components/ui`
  - Expected result: no visible direct native controls remain outside allowed `input type="hidden"` and internals of Base UI/project wrappers.
- Manual browser checks:
  - Login submit and validation.
  - Task create/edit/delete/status flows.
  - OKR period/objective/key result/check-in flows.
  - Review generate/save flow.
  - Example create/edit/delete flow.
  - Quadrant drag/drop and fallback select movement.
  - Token create/delete flow.
  - Keyboard traversal through forms, modals, select popups, and submit buttons.

---

## Design Artifacts

| Artifact | Needed | Notes |
|---|---:|---|
| plan.md | Yes | This file |
| data-model.md | No | No domain or storage changes |
| tasks.md | Later | Generate in `tasks` phase |
| acceptance.md | Later | Useful after implementation for UI/manual checks |

---

## Sources

| Decision | Source URL | Notes |
|---|---|---|
| Next server/client component boundaries | https://nextjs.org/docs/app/getting-started/server-and-client-components | Keep client boundaries narrow |
| Base UI Button | https://base-ui.com/react/components/button | Explicit `type="submit"` required |
| Base UI Field | https://base-ui.com/react/components/field | Field labeling and control state |
| Base UI Select | https://base-ui.com/react/components/select | Dropdown form control primitive |
| Base UI Checkbox | https://base-ui.com/react/components/checkbox | Form integration and hidden input behavior |
| React `useActionState` | https://react.dev/reference/react/useActionState | Existing form action state pattern |
| React DOM `useFormStatus` | https://react.dev/reference/react-dom/hooks/useFormStatus | Existing submit pending pattern |
