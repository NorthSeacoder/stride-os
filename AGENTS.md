# Repository Guidelines

## Project Structure & Module Organization

Stride OS is a pnpm/Turbo monorepo. The Next.js App Router app lives in `apps/web`, with routes under `apps/web/src/app`, shared UI in `apps/web/src/components`, and auth/service helpers in `apps/web/src/lib`. Shared packages live in `packages/*`: `db` owns schema, migrations, seeds, and clients; `api-contract` exports OpenAPI contracts; `ui` exports shared primitives; `config` holds shared config. Tests use colocated `src/__tests__` folders. Product notes and deployment docs live in `docs/`.

## Build, Test, and Development Commands

- `pnpm install`: install workspace dependencies.
- `cp .env.example .env`: create local configuration. Default local mode uses SQLite.
- `pnpm db:setup`: prepare SQLite, run migrations, and seed the admin user.
- `pnpm dev`: run all workspace dev tasks through Turbo; web serves at `http://localhost:3000`.
- `pnpm build`: build all packages/apps.
- `pnpm lint`: run ESLint across workspaces.
- `pnpm typecheck`: run TypeScript checks.
- `pnpm test`: run Vitest once.
- `pnpm check:ci`: run lint, typecheck, test, and build before pushing.

## Coding Style & Naming Conventions

Use TypeScript and React Server Components by default in `apps/web/src/app`; add client components only for browser state or events. Follow existing file naming: route files use Next.js conventions (`page.tsx`, `layout.tsx`, `route.ts`), tests end with `.test.ts`, and shared exports flow through package `src/index.ts` files. ESLint uses `@eslint/js` plus `typescript-eslint`; keep code lint-clean.

## Testing Guidelines

Vitest is configured in `vitest.config.ts` with the `@` alias mapped to `apps/web/src`. Add tests under `apps/**/__tests__/**/*.test.ts` or `packages/**/__tests__/**/*.test.ts`. Cover auth, API validation, database behavior, and migrations when touching those paths. Run `pnpm test`; run `pnpm check:ci` for release-ready verification.

## Commit & Pull Request Guidelines

Git history uses Conventional Commit style, such as `fix(db): avoid sqlite bundling in next dev` and `chore: bootstrap stride os from template`. Use concise scopes (`web`, `db`, `api-contract`, `ui`) and imperative descriptions. PRs should include a short problem/solution summary, linked issue or plan when available, verification commands run, and screenshots for visible UI changes.

## Security & Configuration Tips

Do not commit `.env` or database files from `packages/db/data`. Use `.env.postgres.example` for deployment configuration and run `pnpm db:migrate` plus `pnpm db:seed` after changing database mode.

## Agent-Specific Instructions

If repo-local skills are added, keep `.agents/skills/{skill-name}/SKILL.md` as the source of truth. Expose them through relative symlinks only: `.cursor/skills/{skill-name}` -> `../../.agents/skills/{skill-name}/` and `.claude/skills/{skill-name}` -> `../../.agents/skills/{skill-name}`. Do not create real skill files directly under `.cursor/skills` or `.claude/skills`.
