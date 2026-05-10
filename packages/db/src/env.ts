import path from 'path';
import { fileURLToPath } from 'url';

export type DatabaseDriver = 'sqlite' | 'postgres';

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function parseDriver(value: string): DatabaseDriver {
  if (value === 'sqlite' || value === 'postgres') {
    return value;
  }

  throw new Error(`Unsupported DATABASE_DRIVER: ${value}`);
}

function inferDriver(): DatabaseDriver {
  const configured = process.env.DATABASE_DRIVER;
  if (configured) {
    return parseDriver(configured);
  }

  return process.env.DATABASE_URL?.startsWith('postgres')
    ? 'postgres'
    : 'sqlite';
}

export function defaultSqliteUrl(): string {
  return 'file:./packages/db/data/dev.sqlite';
}

export function workspaceRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
}

export function resolveSqliteDatabasePath(databaseUrl: string): string {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error(`SQLite DATABASE_URL must start with "file:". Received: ${databaseUrl}`);
  }

  if (databaseUrl.startsWith('file://')) {
    return fileURLToPath(databaseUrl);
  }

  return path.resolve(workspaceRoot(), databaseUrl.slice('file:'.length));
}

function envFactory() {
  const databaseDriver = inferDriver();
  const databaseUrl = process.env.DATABASE_URL
    ?? (databaseDriver === 'sqlite' ? defaultSqliteUrl() : '');
  const sessionSecret = process.env.SESSION_SECRET ?? '';
  const databaseSchema = process.env.DATABASE_SCHEMA ?? 'public';
  const adminEmail = optionalEnv('ADMIN_EMAIL', 'admin@example.com');
  const adminPassword = optionalEnv('ADMIN_PASSWORD', 'changeme123');
  const appUrl = optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
  const umamiScriptUrl = optionalEnv('NEXT_PUBLIC_UMAMI_SCRIPT_URL', '');
  const umamiWebsiteId = optionalEnv('NEXT_PUBLIC_UMAMI_WEBSITE_ID', '');
  const dockerRegistry = optionalEnv('DOCKER_REGISTRY', '');
  const dockerImageName = optionalEnv('DOCKER_IMAGE_NAME', 'stride-os');

  let isDatabaseConfigured = false;

  if (databaseDriver === 'sqlite') {
    try {
      resolveSqliteDatabasePath(databaseUrl);
      isDatabaseConfigured = true;
    } catch {
      isDatabaseConfigured = false;
    }
  } else if (databaseUrl) {
    isDatabaseConfigured = Boolean(databaseSchema);
  }

  return {
    databaseDriver,
    databaseUrl,
    databaseSchema: databaseDriver === 'postgres' ? databaseSchema : 'main',
    sessionSecret,
    adminEmail,
    adminPassword,
    appUrl,
    umamiScriptUrl,
    umamiWebsiteId,
    dockerRegistry,
    dockerImageName,
    isDatabaseConfigured,
    isConfigured: Boolean(isDatabaseConfigured && sessionSecret),
  };
}

export const env = envFactory();

export type Env = ReturnType<typeof envFactory>;
