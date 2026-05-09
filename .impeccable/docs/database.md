# Database Modes

## Default local mode: SQLite

The template defaults to SQLite for local development.

Why:

- zero external database setup
- persistent local data between restarts
- shortest first-run path

Default variables in `.env.example`:

```text
DATABASE_DRIVER=sqlite
DATABASE_URL=file:./packages/db/data/dev.sqlite
```

Default local workflow:

```bash
cp .env.example .env
pnpm install
pnpm db:setup
pnpm dev
```

What `pnpm db:setup` does:

- ensures the SQLite data directory exists
- applies SQLite migrations
- seeds the admin user if missing

## Deployment mode: PostgreSQL

Use PostgreSQL for NAS/server deployment.

Start from `.env.postgres.example`:

```text
DATABASE_DRIVER=postgres
DATABASE_URL=postgresql://user:password@host:5432/db
DATABASE_SCHEMA=nextjs_tpl
```

Switch workflow:

```bash
cp .env.postgres.example .env
# edit DATABASE_URL / DATABASE_SCHEMA / SESSION_SECRET
pnpm db:migrate
pnpm db:seed
```

Notes:

- application code does not change between SQLite and PostgreSQL
- `DATABASE_SCHEMA` only matters in PostgreSQL mode
- PostgreSQL remains the recommended deployment database

## Command behavior

All DB commands route by `DATABASE_DRIVER`:

- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm db:setup`
- `pnpm db:studio`

`db:setup` is the first-run command for local SQLite use.

## File paths

Default SQLite database file:

```text
packages/db/data/dev.sqlite
```

This path is ignored by git and safe for local development data.
