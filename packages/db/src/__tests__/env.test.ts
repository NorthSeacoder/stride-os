import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('env factory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns isConfigured false when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_DRIVER;
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_SCHEMA;
    delete process.env.SESSION_SECRET;
    const { env } = await import('../env?test=' + Date.now());
    expect(env.isConfigured).toBe(false);
    expect(env.databaseDriver).toBe('sqlite');
    expect(env.isDatabaseConfigured).toBe(true);
  });

  it('returns isConfigured true when required vars are present', async () => {
    process.env.DATABASE_DRIVER = 'postgres';
    process.env.DATABASE_URL = 'postgresql://u:p@localhost/db';
    process.env.DATABASE_SCHEMA = 'test_schema';
    process.env.SESSION_SECRET = 'secret';
    const { env } = await import('../env?test=' + Date.now());
    expect(env.isConfigured).toBe(true);
    expect(env.databaseDriver).toBe('postgres');
    expect(env.databaseUrl).toBe('postgresql://u:p@localhost/db');
    expect(env.databaseSchema).toBe('test_schema');
  });

  it('uses sqlite defaults when DATABASE_DRIVER=sqlite', async () => {
    process.env.DATABASE_DRIVER = 'sqlite';
    delete process.env.DATABASE_URL;
    process.env.SESSION_SECRET = 'secret';

    const { env } = await import('../env?test=' + Date.now());
    expect(env.isConfigured).toBe(true);
    expect(env.databaseDriver).toBe('sqlite');
    expect(env.databaseUrl).toBe('file:./packages/db/data/dev.sqlite');
    expect(env.databaseSchema).toBe('main');
  });

  it('marks postgres as not fully configured when session secret is missing', async () => {
    process.env.DATABASE_DRIVER = 'postgres';
    process.env.DATABASE_URL = 'postgresql://u:p@localhost/db';
    process.env.DATABASE_SCHEMA = 'test_schema';
    delete process.env.SESSION_SECRET;

    const { env } = await import('../env?test=' + Date.now());
    expect(env.isDatabaseConfigured).toBe(true);
    expect(env.isConfigured).toBe(false);
  });
});
