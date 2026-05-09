import { spawnSync } from 'child_process';
import path from 'path';

const command = process.argv[2];

if (!command) {
  console.error('Usage: tsx scripts/drizzle.ts <generate|migrate|studio> [...args]');
  process.exit(1);
}

const driver = process.env.DATABASE_DRIVER
  ?? (process.env.DATABASE_URL?.startsWith('postgres') ? 'postgres' : 'sqlite');

if (driver !== 'sqlite' && driver !== 'postgres') {
  console.error(`Unsupported DATABASE_DRIVER: ${driver}`);
  process.exit(1);
}

const config = driver === 'sqlite'
  ? 'drizzle.sqlite.config.ts'
  : 'drizzle.postgres.config.ts';

const env = { ...process.env };

if (driver === 'postgres') {
  const schema = process.env.DATABASE_SCHEMA ?? 'public';
  env.PGOPTIONS = `-c search_path=${schema}`;
}

const result = spawnSync(
  'drizzle-kit',
  [command, '--config', path.join(process.cwd(), config), ...process.argv.slice(3)],
  { stdio: 'inherit', shell: true, env },
);

process.exit(result.status ?? 1);
