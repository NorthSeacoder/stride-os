Current-state notes for `derive-kr-progress-from-tasks`

- `createKrCheckIn` currently writes `progressValue` directly into `key_results.current_value` and `confidence` into `key_results.confidence`.
- `getKeyResultProgressSnapshot` currently treats latest check-in as the primary progress source and only exposes `fallbackCurrentValue` from KR itself.
- Tasks already support many-to-many KR links through `keyResultLinks`, but there is no existing derived-progress rule from task completion.
- Dashboard and review flows currently assume missing check-ins are a risk signal.

Implementation close-out notes:

- `currentValue` / `progressValue` remain compatibility fields. User-facing wording should treat them as manual or subjective check-in values, not as the automatic KR task summary.
- The automatic KR execution view is the committed-task summary: completed committed tasks, total committed tasks, open committed tasks, and optional latest task progress time.
- Check-in remains the subjective layer for confidence, narrative summary, blockers, next actions, and optional manual judgment value.
- Verification note: on 2026-05-14, targeted `pnpm test -- ...`, single-file Vitest runs, and `pnpm --filter @stride-os/web typecheck` started but produced no useful result within the validation window. Treat T016 as still open until these commands complete normally.
