import fs from 'fs';
import path from 'path';
import BetterSqlite3 from 'better-sqlite3';
import { drizzle as drizzleSqlite, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env, resolveSqliteDatabasePath } from './env';
import * as schema from './schema';
import { postgresSchema, sqliteSchema } from './schema';

type PostgresDbInstance = NodePgDatabase<typeof postgresSchema>;
type SqliteDbInstance = BetterSQLite3Database<typeof sqliteSchema>;
type DbInstance = PostgresDbInstance | SqliteDbInstance;

let _db: DbInstance | null = null;

function getDb(): DbInstance {
  if (!env.isDatabaseConfigured) {
    throw new Error('Database is not configured. Set DATABASE_DRIVER and DATABASE_URL. For postgres also set DATABASE_SCHEMA.');
  }

  if (!_db) {
    if (env.databaseDriver === 'sqlite') {
      const absolutePath = resolveSqliteDatabasePath(env.databaseUrl);
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      const client = new BetterSqlite3(absolutePath);
      client.pragma('journal_mode = WAL');

      _db = drizzleSqlite(client, {
        schema: sqliteSchema,
        casing: 'snake_case',
      });
    } else {
      const pool = new Pool({
        connectionString: env.databaseUrl,
        options: `--search_path=${env.databaseSchema}`,
      });

      _db = drizzlePg(pool, {
        schema: postgresSchema,
        casing: 'snake_case',
      });
    }
  }

  return _db;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const db: any = new Proxy({} as DbInstance, {
  get(_, prop) {
    const proxyTarget = getDb();
    return Reflect.get(proxyTarget, prop);
  },
}) as any;

export type Database = any;
/* eslint-enable @typescript-eslint/no-explicit-any */
export type { schema };
