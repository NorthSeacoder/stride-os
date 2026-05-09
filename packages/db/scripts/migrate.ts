import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';
import { Client } from 'pg';
import { defaultSqliteUrl, env, resolveSqliteDatabasePath, workspaceRoot } from '../src/env';

type JournalEntry = {
  idx: number;
  tag: string;
};

type JournalFile = {
  entries: JournalEntry[];
};

function runSqliteMigrate() {
  const databaseUrl = env.databaseUrl || defaultSqliteUrl();
  const absolutePath = resolveSqliteDatabasePath(databaseUrl);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

  const result = spawnSync(
    'drizzle-kit',
    ['migrate', '--config', path.join(process.cwd(), 'drizzle.sqlite.config.ts')],
    { stdio: 'inherit', shell: true, env: { ...process.env } },
  );

  process.exit(result.status ?? 1);
}

async function runPostgresMigrate() {
  const databaseUrl = env.databaseUrl;
  const databaseSchema = env.databaseSchema;
  const escapedSchema = databaseSchema.replaceAll('"', '""');
  const migrationsDir = path.join(workspaceRoot(), 'packages/db/drizzle/postgres');
  const journalPath = path.join(migrationsDir, 'meta/_journal.json');
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8')) as JournalFile;

  const client = new Client({
    connectionString: databaseUrl,
  });

  await client.connect();

  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${escapedSchema}"`);
    await client.query(`SET search_path TO "${escapedSchema}", public`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id serial PRIMARY KEY,
        hash text NOT NULL UNIQUE,
        created_at bigint NOT NULL
      )
    `);

    const applied = await client.query<{ hash: string }>('SELECT hash FROM "__drizzle_migrations"');
    const appliedHashes = new Set(applied.rows.map((row) => row.hash));

    for (const entry of journal.entries) {
      if (appliedHashes.has(entry.tag)) {
        continue;
      }

      const sqlPath = path.join(migrationsDir, `${entry.tag}.sql`);
      const rawSql = fs.readFileSync(sqlPath, 'utf8');
      const statements = rawSql
        .split('--> statement-breakpoint')
        .map((chunk) => chunk.trim())
        .filter(Boolean);

      await client.query('BEGIN');
      try {
        for (const statement of statements) {
          await client.query(statement);
        }

        await client.query(
          'INSERT INTO "__drizzle_migrations" ("hash", "created_at") VALUES ($1, $2)',
          [entry.tag, Date.now()],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

async function main() {
  if (env.databaseDriver === 'sqlite') {
    runSqliteMigrate();
    return;
  }

  await runPostgresMigrate();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
