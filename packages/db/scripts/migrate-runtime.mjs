/* global console, process */
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for runtime migrations`);
  }
  return value;
}

function splitMigrationStatements(rawSql) {
  return rawSql
    .split('--> statement-breakpoint')
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

const MIGRATION_LOCK_ID = 7205694421142201;

async function runPostgresMigrations() {
  const databaseUrl = requireEnv('DATABASE_URL');
  const databaseSchema = process.env.DATABASE_SCHEMA || 'public';
  const escapedSchema = databaseSchema.replaceAll('"', '""');
  const migrationsDir = path.join(process.cwd(), 'packages/db/drizzle/postgres');
  const journalPath = path.join(migrationsDir, 'meta/_journal.json');
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);

    const schemaExists = await client.query(
      'SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = $1) AS exists',
      [databaseSchema],
    );
    if (!schemaExists.rows[0]?.exists) {
      await client.query(`CREATE SCHEMA "${escapedSchema}"`);
    }

    await client.query(`SET search_path TO "${escapedSchema}", public`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id serial PRIMARY KEY,
        hash text NOT NULL UNIQUE,
        created_at bigint NOT NULL
      )
    `);

    const applied = await client.query('SELECT hash FROM "__drizzle_migrations"');
    const appliedHashes = new Set(applied.rows.map((row) => row.hash));

    for (const entry of journal.entries) {
      if (appliedHashes.has(entry.tag)) {
        continue;
      }

      const sqlPath = path.join(migrationsDir, `${entry.tag}.sql`);
      const statements = splitMigrationStatements(fs.readFileSync(sqlPath, 'utf8'));

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
        console.log(`[migrate] applied ${entry.tag}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => undefined);
    await client.end();
  }
}

async function main() {
  const driver = process.env.DATABASE_DRIVER
    || (process.env.DATABASE_URL?.startsWith('postgres') ? 'postgres' : 'sqlite');

  if (driver !== 'postgres') {
    console.log(`[migrate] skipped runtime migrations for DATABASE_DRIVER=${driver}`);
    return;
  }

  await runPostgresMigrations();
  console.log('[migrate] complete');
}

main().catch((error) => {
  console.error('[migrate] failed');
  console.error(error);
  process.exit(1);
});
