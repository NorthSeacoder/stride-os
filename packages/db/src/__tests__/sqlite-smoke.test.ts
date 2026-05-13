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
  it('supports legacy and activity-style audit log rows with optional display fields', async () => {
    const user = await sqliteDb.query.users.findFirst({
      where: eq(sqliteSchema.users.email, 'admin@example.com'),
    });

    expect(user).toBeTruthy();

    const legacyAction = `legacy-${Date.now()}`;
    const activityAction = `activity-${Date.now()}`;

    await sqliteDb.insert(sqliteSchema.auditLogs).values({
      actorType: 'user',
      actorId: user!.id,
      action: legacyAction,
      metadata: { channel: 'legacy-smoke' },
    });

    await sqliteDb.insert(sqliteSchema.auditLogs).values({
      actorType: 'user',
      actorId: user!.id,
      action: activityAction,
      targetType: 'task',
      targetTitle: 'Smoke task',
      source: 'web',
      summary: 'Created smoke task',
      metadata: { changedFields: ['title'] },
    });

    const legacyLog = await sqliteDb.query.auditLogs.findFirst({
      where: eq(sqliteSchema.auditLogs.action, legacyAction),
    });
    const activityLog = await sqliteDb.query.auditLogs.findFirst({
      where: eq(sqliteSchema.auditLogs.action, activityAction),
    });

    expect(legacyLog?.targetTitle).toBeNull();
    expect(legacyLog?.source).toBeNull();
    expect(legacyLog?.summary).toBeNull();
    expect(activityLog?.targetTitle).toBe('Smoke task');
    expect(activityLog?.source).toBe('web');
    expect(activityLog?.summary).toBe('Created smoke task');
  });

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

  it('seeds the system Inbox list and supports recurring task definition primitives', async () => {
    const inbox = await sqliteDb.query.taskLists.findFirst({
      where: eq(sqliteSchema.taskLists.slug, 'inbox'),
    });

    expect(inbox).toBeTruthy();
    expect(inbox?.kind).toBe('system');

    const [period] = await sqliteDb.insert(sqliteSchema.periods).values({
      name: '2026 Q3',
      type: 'quarter',
      startDate: '2026-07-01',
      endDate: '2026-09-30',
      status: 'active',
    }).returning();

    const [objective] = await sqliteDb.insert(sqliteSchema.objectives).values({
      periodId: period.id,
      title: 'Stabilize task workspace',
      status: 'active',
      sortOrder: 1,
    }).returning();

    const [keyResult] = await sqliteDb.insert(sqliteSchema.keyResults).values({
      objectiveId: objective.id,
      title: 'Recurring task flow online',
      type: 'milestone',
      status: 'active',
      confidence: 'medium',
    }).returning();

    const [definition] = await sqliteDb.insert(sqliteSchema.taskDefinitions).values({
      title: 'Daily inbox triage',
      description: 'Process inbox every morning',
      listId: inbox!.id,
      frequency: 'daily',
      endType: 'never',
    }).returning();

    await sqliteDb.insert(sqliteSchema.taskDefinitionKrLinks).values({
      definitionId: definition.id,
      keyResultId: keyResult.id,
    });

    const hydrated = await sqliteDb.query.taskDefinitions.findFirst({
      where: eq(sqliteSchema.taskDefinitions.id, definition.id),
      with: {
        list: true,
        keyResultLinks: true,
      },
    });

    expect(hydrated?.list.slug).toBe('inbox');
    expect(hydrated?.keyResultLinks[0]?.keyResultId).toBe(keyResult.id);
  });

  it('supports the OKR alpha domain model and enforces key task/link constraints', async () => {
    const [period] = await sqliteDb.insert(sqliteSchema.periods).values({
      name: '2026 Q2',
      type: 'quarter',
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      status: 'active',
    }).returning();

    const [objective] = await sqliteDb.insert(sqliteSchema.objectives).values({
      periodId: period.id,
      title: 'Ship OKR alpha',
      status: 'active',
      sortOrder: 1,
    }).returning();

    const [keyResult] = await sqliteDb.insert(sqliteSchema.keyResults).values({
      objectiveId: objective.id,
      title: 'Weekly review loop working',
      type: 'hybrid',
      targetValue: 1,
      currentValue: 0.5,
      status: 'active',
      confidence: 'medium',
    }).returning();

    const [checkIn] = await sqliteDb.insert(sqliteSchema.krCheckIns).values({
      keyResultId: keyResult.id,
      progressValue: 0.5,
      confidence: 'high',
      summary: 'Halfway there',
      blockers: 'None',
      nextActions: 'Ship review screen',
    }).returning();

    const [task] = await sqliteDb.insert(sqliteSchema.tasks).values({
      title: 'Write weekly review flow',
      status: 'inbox',
      dueDate: '2026-05-12',
      priority: 'P1',
      energy: 'high',
    }).returning();

    await sqliteDb.insert(sqliteSchema.taskKrLinks).values({
      taskId: task.id,
      keyResultId: keyResult.id,
    });

    const [review] = await sqliteDb.insert(sqliteSchema.reviews).values({
      type: 'weekly',
      periodStart: '2026-05-04',
      periodEnd: '2026-05-10',
      status: 'draft',
      title: 'Week 19 review',
      body: 'Draft review',
      structuredSummary: { wins: ['linked task to KR'] },
    }).returning();

    await sqliteDb.insert(sqliteSchema.reviewKrSnapshots).values({
      reviewId: review.id,
      keyResultId: keyResult.id,
      snapshot: { confidence: 'medium', currentValue: 0.5 },
    });

    const hydratedPeriod = await sqliteDb.query.periods.findFirst({
      where: eq(sqliteSchema.periods.id, period.id),
      with: {
        objectives: {
          with: {
            keyResults: {
              with: {
                checkIns: true,
                taskLinks: true,
                reviewSnapshots: true,
              },
            },
          },
        },
      },
    });

    expect(hydratedPeriod?.objectives).toHaveLength(1);
    expect(hydratedPeriod?.objectives[0]?.keyResults[0]?.checkIns[0]?.id).toBe(checkIn.id);
    expect(hydratedPeriod?.objectives[0]?.keyResults[0]?.taskLinks[0]?.taskId).toBe(task.id);
    expect(hydratedPeriod?.objectives[0]?.keyResults[0]?.reviewSnapshots[0]?.reviewId).toBe(review.id);
    expect(review.createdAt).toBeTruthy();

    await expect(
      sqliteDb.insert(sqliteSchema.taskKrLinks).values({
        taskId: task.id,
        keyResultId: keyResult.id,
      }),
    ).rejects.toThrow();

    await expect(
      sqliteDb.insert(sqliteSchema.tasks).values({
        title: 'Broken done task',
        status: 'done',
      }),
    ).rejects.toThrow();
  });
});
