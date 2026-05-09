import fs from 'fs';
import path from 'path';
import { defaultSqliteUrl, resolveSqliteDatabasePath } from '../src/env';

const driver = process.env.DATABASE_DRIVER
  ?? (process.env.DATABASE_URL?.startsWith('postgres') ? 'postgres' : 'sqlite');

if (driver !== 'sqlite') {
  process.exit(0);
}

const databaseUrl = process.env.DATABASE_URL ?? defaultSqliteUrl();
const absolutePath = resolveSqliteDatabasePath(databaseUrl);

fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
