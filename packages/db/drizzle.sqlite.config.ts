import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { defaultSqliteUrl, resolveSqliteDatabasePath } from './src/env';

const databaseUrl = process.env.DATABASE_URL ?? defaultSqliteUrl();

export default defineConfig({
  schema: './src/schema/sqlite.ts',
  out: './drizzle/sqlite',
  dialect: 'sqlite',
  dbCredentials: {
    url: resolveSqliteDatabasePath(databaseUrl),
  },
});
