import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../client';
import * as sqliteSchema from '../schema/sqlite';

const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;

const packageRoot = path.resolve(process.cwd(), 'packages/db');
const databasePath = path.join(packageRoot, 'data', 'dev.sqlite');

function removeSqliteArtifacts() {
  for (const suffix of ['', '-shm', '-wal']) {
    const filename = `${databasePath}${suffix}`;
    fs.rmSync(filename, { force: true });
  }
}

beforeAll(() => {
  removeSqliteArtifacts();
  execSync('pnpm --filter @stride-os/db db:migrate', {
    cwd: packageRoot,
    stdio: 'inherit',
  });
  execSync('pnpm --filter @stride-os/db db:seed', {
    cwd: packageRoot,
    stdio: 'inherit',
  });
});

describe('sqlite smoke', () => {
  it('supports token and example CRUD primitives on the default sqlite database', async () => {
    const user = await sqliteDb.query.users.findFirst({
      where: eq(sqliteSchema.users.email, 'admin@example.com'),
    });

    expect(user).toBeTruthy();

    const tokenHash = `smoke-${Date.now()}`;
    await sqliteDb.insert(sqliteSchema.apiTokens).values({
      userId: user!.id,
      name: 'smoke',
      tokenHash,
      scopes: [],
    });

    const token = await sqliteDb.query.apiTokens.findFirst({
      where: eq(sqliteSchema.apiTokens.tokenHash, tokenHash),
    });

    expect(token?.name).toBe('smoke');

    const [created] = await sqliteDb.insert(sqliteSchema.exampleItems).values({
      title: 'sqlite smoke',
      status: 'active',
      notes: 'ok',
    }).returning();

    expect(created.title).toBe('sqlite smoke');

    const [updated] = await sqliteDb.update(sqliteSchema.exampleItems)
      .set({ status: 'done', updatedAt: new Date() })
      .where(eq(sqliteSchema.exampleItems.id, created.id))
      .returning();

    expect(updated.status).toBe('done');

    const [removed] = await sqliteDb.delete(sqliteSchema.exampleItems)
      .where(eq(sqliteSchema.exampleItems.id, created.id))
      .returning({ id: sqliteSchema.exampleItems.id });

    expect(removed.id).toBe(created.id);
  });
});
