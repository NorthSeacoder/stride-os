import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db } from '../src/client';
import { env } from '../src/env';
import { validateOkrImportDocument, type OkrImportDocument } from '../src/okr-import-schema';
import * as postgresSchema from '../src/schema/postgres';
import * as sqliteSchema from '../src/schema/sqlite';

type ValidationOnlyReport = {
  mode: 'validation-only';
  file: string;
  period: {
    name: string;
    type: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  summary: {
    taskListCount: number;
    objectiveCount: number;
    keyResultCount: number;
  };
  taskLists: Array<{
    slug: string;
    name: string;
    objectiveCount: number;
    keyResultCount: number;
    objectives: Array<{
      refId: string;
      title: string;
      keyResultCount: number;
    }>;
  }>;
  errors: string[];
  ok: boolean;
};

type TaskListsOnlyReport = {
  mode: 'task-lists-only';
  file: string;
  databaseDriver: string;
  databaseLocation: string;
  ok: boolean;
  errors: string[];
  summary: {
    taskListCount: number;
    created: number;
    updated: number;
    reused: number;
  };
  taskLists: Array<{
    slug: string;
    name: string;
    action: 'created' | 'updated' | 'reused';
    id: string;
  }>;
};

type PeriodOnlyReport = {
  mode: 'period-only';
  file: string;
  databaseDriver: string;
  databaseLocation: string;
  ok: boolean;
  errors: string[];
  period: {
    id: string;
    name: string;
    type: string;
    startDate: string;
    endDate: string;
    status: string;
    action: 'created' | 'updated' | 'reused';
  } | null;
};

type ObjectivesOnlyReport = {
  mode: 'objectives-only';
  file: string;
  databaseDriver: string;
  databaseLocation: string;
  ok: boolean;
  errors: string[];
  periodId: string | null;
  summary: {
    objectiveCount: number;
    created: number;
    updated: number;
    reused: number;
  };
  taskLists: Array<{
    slug: string;
    objectives: Array<{
      refId: string;
      title: string;
      action: 'created' | 'updated' | 'reused';
      objectiveId: string;
    }>;
  }>;
};

type KeyResultsOnlyReport = {
  mode: 'key-results-only';
  file: string;
  databaseDriver: string;
  databaseLocation: string;
  ok: boolean;
  errors: string[];
  summary: {
    keyResultCount: number;
    created: number;
    updated: number;
    reused: number;
  };
  objectives: Array<{
    objectiveRefId: string;
    objectiveId: string;
    keyResults: Array<{
      refId: string;
      title: string;
      action: 'created' | 'updated' | 'reused';
      keyResultId: string;
    }>;
  }>;
};

type ManifestReport = {
  mode: 'manifest';
  file: string;
  manifestPath: string;
  databaseDriver: string;
  databaseLocation: string;
  ok: boolean;
  errors: string[];
  summary: {
    taskListCount: number;
    objectiveCount: number;
    keyResultCount: number;
  };
};

type ImportManifest = {
  sourceFile: string;
  databaseDriver: string;
  databaseLocation: string;
  period: {
    name: string;
    id: string;
  };
  taskLists: Array<{
    slug: string;
    name: string;
    id: string;
    objectives: Array<{
      refId: string;
      title: string;
      objectiveId: string;
      keyResults: Array<{
        refId: string;
        title: string;
        keyResultId: string;
      }>;
    }>;
  }>;
};

function resolveDefaultInputPath() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, '../../../docs/data/okr-2026.json');
}

function resolveDefaultManifestPath() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, '../data/okr-2026.import-manifest.json');
}

function parseArgs(argv: string[]) {
  const fileArg = argv.find((arg) => arg.startsWith('--file='));
  const manifestArg = argv.find((arg) => arg.startsWith('--manifest='));
  return {
    file: fileArg ? fileArg.slice('--file='.length) : resolveDefaultInputPath(),
    validateOnly: argv.includes('--validate-only') || argv.length === 0,
    taskListsOnly: argv.includes('--task-lists-only'),
    periodOnly: argv.includes('--period-only'),
    objectivesOnly: argv.includes('--objectives-only'),
    keyResultsOnly: argv.includes('--key-results-only'),
    manifest: argv.includes('--manifest'),
    manifestPath: manifestArg ? manifestArg.slice('--manifest='.length) : resolveDefaultManifestPath(),
  };
}

function getDatabaseLocation() {
  return env.databaseDriver === 'postgres'
    ? `schema ${env.databaseSchema}`
    : env.databaseUrl;
}

function buildValidationOnlyReport(file: string, document: OkrImportDocument): ValidationOnlyReport {
  const validation = validateOkrImportDocument(document);

  return {
    mode: 'validation-only',
    file,
    period: {
      name: document.period.name,
      type: document.period.type,
      startDate: document.period.startDate,
      endDate: document.period.endDate,
      status: document.period.status,
    },
    summary: validation.summary,
    taskLists: document.taskLists.map((taskList) => ({
      slug: taskList.slug,
      name: taskList.name,
      objectiveCount: taskList.objectives.length,
      keyResultCount: taskList.objectives.reduce((count, objective) => count + objective.keyResults.length, 0),
      objectives: taskList.objectives.map((objective) => ({
        refId: objective.refId,
        title: objective.title,
        keyResultCount: objective.keyResults.length,
      })),
    })),
    errors: validation.errors,
    ok: validation.ok,
  };
}

async function upsertTaskListsSqlite(
  sqliteDb: BetterSQLite3Database<typeof sqliteSchema>,
  document: OkrImportDocument,
) {
  const actions: TaskListsOnlyReport['taskLists'] = [];

  for (const taskList of document.taskLists) {
    const existing = await sqliteDb.query.taskLists.findFirst({
      where: eq(sqliteSchema.taskLists.slug, taskList.slug),
    });

    if (!existing) {
      const [created] = await sqliteDb.insert(sqliteSchema.taskLists).values({
        name: taskList.name,
        icon: taskList.icon ?? null,
        kind: taskList.kind,
        slug: taskList.slug,
        sortOrder: taskList.sortOrder,
      }).returning();

      actions.push({
        slug: taskList.slug,
        name: taskList.name,
        action: 'created',
        id: created.id,
      });
      continue;
    }

    if (
      existing.name !== taskList.name ||
      (existing.icon ?? null) !== (taskList.icon ?? null) ||
      existing.kind !== taskList.kind ||
      existing.sortOrder !== taskList.sortOrder
    ) {
      const [updated] = await sqliteDb.update(sqliteSchema.taskLists)
        .set({
          name: taskList.name,
          icon: taskList.icon ?? null,
          kind: taskList.kind,
          sortOrder: taskList.sortOrder,
          updatedAt: new Date(),
        })
        .where(eq(sqliteSchema.taskLists.id, existing.id))
        .returning();

      actions.push({
        slug: taskList.slug,
        name: taskList.name,
        action: 'updated',
        id: updated.id,
      });
      continue;
    }

    actions.push({
      slug: taskList.slug,
      name: taskList.name,
      action: 'reused',
      id: existing.id,
    });
  }

  return actions;
}

async function upsertTaskListsPostgres(
  postgresDb: NodePgDatabase<typeof postgresSchema>,
  document: OkrImportDocument,
) {
  const actions: TaskListsOnlyReport['taskLists'] = [];

  for (const taskList of document.taskLists) {
    const existing = await postgresDb.query.taskLists.findFirst({
      where: eq(postgresSchema.taskLists.slug, taskList.slug),
    });

    if (!existing) {
      const [created] = await postgresDb.insert(postgresSchema.taskLists).values({
        name: taskList.name,
        icon: taskList.icon ?? null,
        kind: taskList.kind,
        slug: taskList.slug,
        sortOrder: taskList.sortOrder,
      }).returning();

      actions.push({
        slug: taskList.slug,
        name: taskList.name,
        action: 'created',
        id: created.id,
      });
      continue;
    }

    if (
      existing.name !== taskList.name ||
      (existing.icon ?? null) !== (taskList.icon ?? null) ||
      existing.kind !== taskList.kind ||
      existing.sortOrder !== taskList.sortOrder
    ) {
      const [updated] = await postgresDb.update(postgresSchema.taskLists)
        .set({
          name: taskList.name,
          icon: taskList.icon ?? null,
          kind: taskList.kind,
          sortOrder: taskList.sortOrder,
          updatedAt: new Date(),
        })
        .where(eq(postgresSchema.taskLists.id, existing.id))
        .returning();

      actions.push({
        slug: taskList.slug,
        name: taskList.name,
        action: 'updated',
        id: updated.id,
      });
      continue;
    }

    actions.push({
      slug: taskList.slug,
      name: taskList.name,
      action: 'reused',
      id: existing.id,
    });
  }

  return actions;
}

async function buildTaskListsOnlyReport(file: string, document: OkrImportDocument): Promise<TaskListsOnlyReport> {
  const validation = validateOkrImportDocument(document);
  if (!validation.ok) {
    return {
      mode: 'task-lists-only',
      file,
      databaseDriver: env.databaseDriver,
      databaseLocation: getDatabaseLocation(),
      ok: false,
      errors: validation.errors,
      summary: {
        taskListCount: validation.summary.taskListCount,
        created: 0,
        updated: 0,
        reused: 0,
      },
      taskLists: [],
    };
  }

  const taskLists = env.databaseDriver === 'sqlite'
    ? await upsertTaskListsSqlite(db as BetterSQLite3Database<typeof sqliteSchema>, document)
    : await upsertTaskListsPostgres(db as NodePgDatabase<typeof postgresSchema>, document);

  return {
    mode: 'task-lists-only',
    file,
    databaseDriver: env.databaseDriver,
    databaseLocation: getDatabaseLocation(),
    ok: true,
    errors: [],
    summary: {
      taskListCount: taskLists.length,
      created: taskLists.filter((item) => item.action === 'created').length,
      updated: taskLists.filter((item) => item.action === 'updated').length,
      reused: taskLists.filter((item) => item.action === 'reused').length,
    },
    taskLists,
  };
}

async function upsertPeriodSqlite(
  sqliteDb: BetterSQLite3Database<typeof sqliteSchema>,
  document: OkrImportDocument,
) {
  const existing = await sqliteDb.query.periods.findFirst({
    where: eq(sqliteSchema.periods.name, document.period.name),
  });

  if (!existing) {
    const [created] = await sqliteDb.insert(sqliteSchema.periods).values({
      name: document.period.name,
      type: document.period.type,
      startDate: document.period.startDate,
      endDate: document.period.endDate,
      status: document.period.status,
    }).returning();

    return {
      id: created.id,
      name: created.name,
      type: created.type,
      startDate: created.startDate,
      endDate: created.endDate,
      status: created.status,
      action: 'created' as const,
    };
  }

  if (
    existing.type !== document.period.type ||
    existing.startDate !== document.period.startDate ||
    existing.endDate !== document.period.endDate ||
    existing.status !== document.period.status
  ) {
    const [updated] = await sqliteDb.update(sqliteSchema.periods)
      .set({
        type: document.period.type,
        startDate: document.period.startDate,
        endDate: document.period.endDate,
        status: document.period.status,
        updatedAt: new Date(),
      })
      .where(eq(sqliteSchema.periods.id, existing.id))
      .returning();

    return {
      id: updated.id,
      name: updated.name,
      type: updated.type,
      startDate: updated.startDate,
      endDate: updated.endDate,
      status: updated.status,
      action: 'updated' as const,
    };
  }

  return {
    id: existing.id,
    name: existing.name,
    type: existing.type,
    startDate: existing.startDate,
    endDate: existing.endDate,
    status: existing.status,
    action: 'reused' as const,
  };
}

async function upsertPeriodPostgres(
  postgresDb: NodePgDatabase<typeof postgresSchema>,
  document: OkrImportDocument,
) {
  const existing = await postgresDb.query.periods.findFirst({
    where: eq(postgresSchema.periods.name, document.period.name),
  });

  if (!existing) {
    const [created] = await postgresDb.insert(postgresSchema.periods).values({
      name: document.period.name,
      type: document.period.type,
      startDate: document.period.startDate,
      endDate: document.period.endDate,
      status: document.period.status,
    }).returning();

    return {
      id: created.id,
      name: created.name,
      type: created.type,
      startDate: created.startDate,
      endDate: created.endDate,
      status: created.status,
      action: 'created' as const,
    };
  }

  if (
    existing.type !== document.period.type ||
    existing.startDate !== document.period.startDate ||
    existing.endDate !== document.period.endDate ||
    existing.status !== document.period.status
  ) {
    const [updated] = await postgresDb.update(postgresSchema.periods)
      .set({
        type: document.period.type,
        startDate: document.period.startDate,
        endDate: document.period.endDate,
        status: document.period.status,
        updatedAt: new Date(),
      })
      .where(eq(postgresSchema.periods.id, existing.id))
      .returning();

    return {
      id: updated.id,
      name: updated.name,
      type: updated.type,
      startDate: updated.startDate,
      endDate: updated.endDate,
      status: updated.status,
      action: 'updated' as const,
    };
  }

  return {
    id: existing.id,
    name: existing.name,
    type: existing.type,
    startDate: existing.startDate,
    endDate: existing.endDate,
    status: existing.status,
    action: 'reused' as const,
  };
}

async function buildPeriodOnlyReport(file: string, document: OkrImportDocument): Promise<PeriodOnlyReport> {
  const validation = validateOkrImportDocument(document);
  if (!validation.ok) {
    return {
      mode: 'period-only',
      file,
      databaseDriver: env.databaseDriver,
      databaseLocation: getDatabaseLocation(),
      ok: false,
      errors: validation.errors,
      period: null,
    };
  }

  const period = env.databaseDriver === 'sqlite'
    ? await upsertPeriodSqlite(db as BetterSQLite3Database<typeof sqliteSchema>, document)
    : await upsertPeriodPostgres(db as NodePgDatabase<typeof postgresSchema>, document);

  return {
    mode: 'period-only',
    file,
    databaseDriver: env.databaseDriver,
    databaseLocation: getDatabaseLocation(),
    ok: true,
    errors: [],
    period,
  };
}

async function findPeriodSqlite(
  sqliteDb: BetterSQLite3Database<typeof sqliteSchema>,
  document: OkrImportDocument,
) {
  return sqliteDb.query.periods.findFirst({
    where: eq(sqliteSchema.periods.name, document.period.name),
  });
}

async function findPeriodPostgres(
  postgresDb: NodePgDatabase<typeof postgresSchema>,
  document: OkrImportDocument,
) {
  return postgresDb.query.periods.findFirst({
    where: eq(postgresSchema.periods.name, document.period.name),
  });
}

async function upsertObjectivesSqlite(
  sqliteDb: BetterSQLite3Database<typeof sqliteSchema>,
  document: OkrImportDocument,
  periodId: string,
) {
  const taskLists: ObjectivesOnlyReport['taskLists'] = [];

  for (const taskList of document.taskLists) {
    const objectives: ObjectivesOnlyReport['taskLists'][number]['objectives'] = [];

    for (const objective of taskList.objectives) {
      const existing = await sqliteDb.query.objectives.findFirst({
        where: eq(sqliteSchema.objectives.title, objective.title),
      });

      if (!existing) {
        const [created] = await sqliteDb.insert(sqliteSchema.objectives).values({
          periodId,
          title: objective.title,
          description: objective.description ?? null,
          status: objective.status,
          sortOrder: objective.sortOrder,
        }).returning();

        objectives.push({
          refId: objective.refId,
          title: objective.title,
          action: 'created',
          objectiveId: created.id,
        });
        continue;
      }

      if (
        existing.periodId !== periodId ||
        (existing.description ?? null) !== (objective.description ?? null) ||
        existing.status !== objective.status ||
        existing.sortOrder !== objective.sortOrder
      ) {
        const [updated] = await sqliteDb.update(sqliteSchema.objectives)
          .set({
            periodId,
            description: objective.description ?? null,
            status: objective.status,
            sortOrder: objective.sortOrder,
            updatedAt: new Date(),
          })
          .where(eq(sqliteSchema.objectives.id, existing.id))
          .returning();

        objectives.push({
          refId: objective.refId,
          title: objective.title,
          action: 'updated',
          objectiveId: updated.id,
        });
        continue;
      }

      objectives.push({
        refId: objective.refId,
        title: objective.title,
        action: 'reused',
        objectiveId: existing.id,
      });
    }

    taskLists.push({
      slug: taskList.slug,
      objectives,
    });
  }

  return taskLists;
}

async function upsertObjectivesPostgres(
  postgresDb: NodePgDatabase<typeof postgresSchema>,
  document: OkrImportDocument,
  periodId: string,
) {
  const taskLists: ObjectivesOnlyReport['taskLists'] = [];

  for (const taskList of document.taskLists) {
    const objectives: ObjectivesOnlyReport['taskLists'][number]['objectives'] = [];

    for (const objective of taskList.objectives) {
      const existing = await postgresDb.query.objectives.findFirst({
        where: eq(postgresSchema.objectives.title, objective.title),
      });

      if (!existing) {
        const [created] = await postgresDb.insert(postgresSchema.objectives).values({
          periodId,
          title: objective.title,
          description: objective.description ?? null,
          status: objective.status,
          sortOrder: objective.sortOrder,
        }).returning();

        objectives.push({
          refId: objective.refId,
          title: objective.title,
          action: 'created',
          objectiveId: created.id,
        });
        continue;
      }

      if (
        existing.periodId !== periodId ||
        (existing.description ?? null) !== (objective.description ?? null) ||
        existing.status !== objective.status ||
        existing.sortOrder !== objective.sortOrder
      ) {
        const [updated] = await postgresDb.update(postgresSchema.objectives)
          .set({
            periodId,
            description: objective.description ?? null,
            status: objective.status,
            sortOrder: objective.sortOrder,
            updatedAt: new Date(),
          })
          .where(eq(postgresSchema.objectives.id, existing.id))
          .returning();

        objectives.push({
          refId: objective.refId,
          title: objective.title,
          action: 'updated',
          objectiveId: updated.id,
        });
        continue;
      }

      objectives.push({
        refId: objective.refId,
        title: objective.title,
        action: 'reused',
        objectiveId: existing.id,
      });
    }

    taskLists.push({
      slug: taskList.slug,
      objectives,
    });
  }

  return taskLists;
}

async function buildObjectivesOnlyReport(file: string, document: OkrImportDocument): Promise<ObjectivesOnlyReport> {
  const validation = validateOkrImportDocument(document);
  if (!validation.ok) {
    return {
      mode: 'objectives-only',
      file,
      databaseDriver: env.databaseDriver,
      databaseLocation: getDatabaseLocation(),
      ok: false,
      errors: validation.errors,
      periodId: null,
      summary: {
        objectiveCount: 0,
        created: 0,
        updated: 0,
        reused: 0,
      },
      taskLists: [],
    };
  }

  const period = env.databaseDriver === 'sqlite'
    ? await findPeriodSqlite(db as BetterSQLite3Database<typeof sqliteSchema>, document)
    : await findPeriodPostgres(db as NodePgDatabase<typeof postgresSchema>, document);

  if (!period) {
    return {
      mode: 'objectives-only',
      file,
      databaseDriver: env.databaseDriver,
      databaseLocation: getDatabaseLocation(),
      ok: false,
      errors: [`period ${document.period.name} does not exist; run --period-only first`],
      periodId: null,
      summary: {
        objectiveCount: 0,
        created: 0,
        updated: 0,
        reused: 0,
      },
      taskLists: [],
    };
  }

  const taskLists = env.databaseDriver === 'sqlite'
    ? await upsertObjectivesSqlite(db as BetterSQLite3Database<typeof sqliteSchema>, document, period.id)
    : await upsertObjectivesPostgres(db as NodePgDatabase<typeof postgresSchema>, document, period.id);

  const objectives = taskLists.flatMap((taskList) => taskList.objectives);

  return {
    mode: 'objectives-only',
    file,
    databaseDriver: env.databaseDriver,
    databaseLocation: getDatabaseLocation(),
    ok: true,
    errors: [],
    periodId: period.id,
    summary: {
      objectiveCount: objectives.length,
      created: objectives.filter((item) => item.action === 'created').length,
      updated: objectives.filter((item) => item.action === 'updated').length,
      reused: objectives.filter((item) => item.action === 'reused').length,
    },
    taskLists,
  };
}

async function findObjectiveSqlite(
  sqliteDb: BetterSQLite3Database<typeof sqliteSchema>,
  title: string,
) {
  return sqliteDb.query.objectives.findFirst({
    where: eq(sqliteSchema.objectives.title, title),
  });
}

async function findObjectivePostgres(
  postgresDb: NodePgDatabase<typeof postgresSchema>,
  title: string,
) {
  return postgresDb.query.objectives.findFirst({
    where: eq(postgresSchema.objectives.title, title),
  });
}

async function upsertKeyResultsSqlite(
  sqliteDb: BetterSQLite3Database<typeof sqliteSchema>,
  document: OkrImportDocument,
) {
  const objectives: KeyResultsOnlyReport['objectives'] = [];

  for (const taskList of document.taskLists) {
    for (const objective of taskList.objectives) {
      const existingObjective = await findObjectiveSqlite(sqliteDb, objective.title);
      if (!existingObjective) {
        throw new Error(`objective ${objective.refId} does not exist; run --objectives-only first`);
      }

      const keyResults: KeyResultsOnlyReport['objectives'][number]['keyResults'] = [];

      for (const keyResult of objective.keyResults) {
        const existing = await sqliteDb.query.keyResults.findFirst({
          where: eq(sqliteSchema.keyResults.title, keyResult.title),
        });

        if (!existing) {
          const [created] = await sqliteDb.insert(sqliteSchema.keyResults).values({
            objectiveId: existingObjective.id,
            title: keyResult.title,
            description: keyResult.description ?? null,
            status: keyResult.status,
          }).returning();

          keyResults.push({
            refId: keyResult.refId,
            title: keyResult.title,
            action: 'created',
            keyResultId: created.id,
          });
          continue;
        }

        if (
          existing.objectiveId !== existingObjective.id ||
          (existing.description ?? null) !== (keyResult.description ?? null) ||
          existing.status !== keyResult.status
        ) {
          const [updated] = await sqliteDb.update(sqliteSchema.keyResults)
            .set({
              objectiveId: existingObjective.id,
              description: keyResult.description ?? null,
              status: keyResult.status,
              updatedAt: new Date(),
            })
            .where(eq(sqliteSchema.keyResults.id, existing.id))
            .returning();

          keyResults.push({
            refId: keyResult.refId,
            title: keyResult.title,
            action: 'updated',
            keyResultId: updated.id,
          });
          continue;
        }

        keyResults.push({
          refId: keyResult.refId,
          title: keyResult.title,
          action: 'reused',
          keyResultId: existing.id,
        });
      }

      objectives.push({
        objectiveRefId: objective.refId,
        objectiveId: existingObjective.id,
        keyResults,
      });
    }
  }

  return objectives;
}

async function upsertKeyResultsPostgres(
  postgresDb: NodePgDatabase<typeof postgresSchema>,
  document: OkrImportDocument,
) {
  const objectives: KeyResultsOnlyReport['objectives'] = [];

  for (const taskList of document.taskLists) {
    for (const objective of taskList.objectives) {
      const existingObjective = await findObjectivePostgres(postgresDb, objective.title);
      if (!existingObjective) {
        throw new Error(`objective ${objective.refId} does not exist; run --objectives-only first`);
      }

      const keyResults: KeyResultsOnlyReport['objectives'][number]['keyResults'] = [];

      for (const keyResult of objective.keyResults) {
        const existing = await postgresDb.query.keyResults.findFirst({
          where: eq(postgresSchema.keyResults.title, keyResult.title),
        });

        if (!existing) {
          const [created] = await postgresDb.insert(postgresSchema.keyResults).values({
            objectiveId: existingObjective.id,
            title: keyResult.title,
            description: keyResult.description ?? null,
            status: keyResult.status,
          }).returning();

          keyResults.push({
            refId: keyResult.refId,
            title: keyResult.title,
            action: 'created',
            keyResultId: created.id,
          });
          continue;
        }

        if (
          existing.objectiveId !== existingObjective.id ||
          (existing.description ?? null) !== (keyResult.description ?? null) ||
          existing.status !== keyResult.status
        ) {
          const [updated] = await postgresDb.update(postgresSchema.keyResults)
            .set({
              objectiveId: existingObjective.id,
              description: keyResult.description ?? null,
              status: keyResult.status,
              updatedAt: new Date(),
            })
            .where(eq(postgresSchema.keyResults.id, existing.id))
            .returning();

          keyResults.push({
            refId: keyResult.refId,
            title: keyResult.title,
            action: 'updated',
            keyResultId: updated.id,
          });
          continue;
        }

        keyResults.push({
          refId: keyResult.refId,
          title: keyResult.title,
          action: 'reused',
          keyResultId: existing.id,
        });
      }

      objectives.push({
        objectiveRefId: objective.refId,
        objectiveId: existingObjective.id,
        keyResults,
      });
    }
  }

  return objectives;
}

async function buildKeyResultsOnlyReport(file: string, document: OkrImportDocument): Promise<KeyResultsOnlyReport> {
  const validation = validateOkrImportDocument(document);
  if (!validation.ok) {
    return {
      mode: 'key-results-only',
      file,
      databaseDriver: env.databaseDriver,
      databaseLocation: getDatabaseLocation(),
      ok: false,
      errors: validation.errors,
      summary: {
        keyResultCount: 0,
        created: 0,
        updated: 0,
        reused: 0,
      },
      objectives: [],
    };
  }

  const objectives = env.databaseDriver === 'sqlite'
    ? await upsertKeyResultsSqlite(db as BetterSQLite3Database<typeof sqliteSchema>, document)
    : await upsertKeyResultsPostgres(db as NodePgDatabase<typeof postgresSchema>, document);

  const keyResults = objectives.flatMap((objective) => objective.keyResults);

  return {
    mode: 'key-results-only',
    file,
    databaseDriver: env.databaseDriver,
    databaseLocation: getDatabaseLocation(),
    ok: true,
    errors: [],
    summary: {
      keyResultCount: keyResults.length,
      created: keyResults.filter((item) => item.action === 'created').length,
      updated: keyResults.filter((item) => item.action === 'updated').length,
      reused: keyResults.filter((item) => item.action === 'reused').length,
    },
    objectives,
  };
}

async function buildManifestReport(
  file: string,
  manifestPath: string,
  document: OkrImportDocument,
): Promise<ManifestReport> {
  const validation = validateOkrImportDocument(document);
  if (!validation.ok) {
    return {
      mode: 'manifest',
      file,
      manifestPath,
      databaseDriver: env.databaseDriver,
      databaseLocation: getDatabaseLocation(),
      ok: false,
      errors: validation.errors,
      summary: {
        taskListCount: 0,
        objectiveCount: 0,
        keyResultCount: 0,
      },
    };
  }

  const periodReport = await buildPeriodOnlyReport(file, document);
  if (!periodReport.ok || !periodReport.period) {
    return {
      mode: 'manifest',
      file,
      manifestPath,
      databaseDriver: env.databaseDriver,
      databaseLocation: getDatabaseLocation(),
      ok: false,
      errors: periodReport.errors,
      summary: {
        taskListCount: 0,
        objectiveCount: 0,
        keyResultCount: 0,
      },
    };
  }

  const taskListsReport = await buildTaskListsOnlyReport(file, document);
  const objectivesReport = await buildObjectivesOnlyReport(file, document);
  const keyResultsReport = await buildKeyResultsOnlyReport(file, document);

  if (!taskListsReport.ok || !objectivesReport.ok || !keyResultsReport.ok) {
    return {
      mode: 'manifest',
      file,
      manifestPath,
      databaseDriver: env.databaseDriver,
      databaseLocation: getDatabaseLocation(),
      ok: false,
      errors: [
        ...taskListsReport.errors,
        ...objectivesReport.errors,
        ...keyResultsReport.errors,
      ],
      summary: {
        taskListCount: 0,
        objectiveCount: 0,
        keyResultCount: 0,
      },
    };
  }

  const objectiveLookup = new Map(
    objectivesReport.taskLists.flatMap((taskList) =>
      taskList.objectives.map((objective) => [`${taskList.slug}:${objective.refId}`, objective] as const)),
  );
  const keyResultLookup = new Map(
    keyResultsReport.objectives.map((objective) => [objective.objectiveRefId, objective.keyResults] as const),
  );
  const taskListLookup = new Map(taskListsReport.taskLists.map((taskList) => [taskList.slug, taskList] as const));

  const manifest: ImportManifest = {
    sourceFile: file,
    databaseDriver: env.databaseDriver,
    databaseLocation: getDatabaseLocation(),
    period: {
      name: periodReport.period.name,
      id: periodReport.period.id,
    },
    taskLists: document.taskLists.map((taskList) => ({
      slug: taskList.slug,
      name: taskList.name,
      id: taskListLookup.get(taskList.slug)?.id ?? '',
      objectives: taskList.objectives.map((objective) => ({
        refId: objective.refId,
        title: objective.title,
        objectiveId: objectiveLookup.get(`${taskList.slug}:${objective.refId}`)?.objectiveId ?? '',
        keyResults: (keyResultLookup.get(objective.refId) ?? []).map((keyResult) => ({
          refId: keyResult.refId,
          title: keyResult.title,
          keyResultId: keyResult.keyResultId,
        })),
      })),
    })),
  };

  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return {
    mode: 'manifest',
    file,
    manifestPath,
    databaseDriver: env.databaseDriver,
    databaseLocation: getDatabaseLocation(),
    ok: true,
    errors: [],
    summary: {
      taskListCount: manifest.taskLists.length,
      objectiveCount: manifest.taskLists.reduce((count, taskList) => count + taskList.objectives.length, 0),
      keyResultCount: manifest.taskLists.reduce(
        (count, taskList) =>
          count + taskList.objectives.reduce((inner, objective) => inner + objective.keyResults.length, 0),
        0,
      ),
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const raw = fs.readFileSync(args.file, 'utf8');
  const document = JSON.parse(raw) as OkrImportDocument;

  if (args.taskListsOnly) {
    const report = await buildTaskListsOnlyReport(args.file, document);
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) {
      process.exit(1);
    }
    return;
  }

  if (args.periodOnly) {
    const report = await buildPeriodOnlyReport(args.file, document);
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) {
      process.exit(1);
    }
    return;
  }

  if (args.objectivesOnly) {
    const report = await buildObjectivesOnlyReport(args.file, document);
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) {
      process.exit(1);
    }
    return;
  }

  if (args.keyResultsOnly) {
    const report = await buildKeyResultsOnlyReport(args.file, document);
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) {
      process.exit(1);
    }
    return;
  }

  if (args.manifest) {
    const report = await buildManifestReport(args.file, args.manifestPath, document);
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) {
      process.exit(1);
    }
    return;
  }

  if (args.validateOnly) {
    const report = buildValidationOnlyReport(args.file, document);
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) {
      process.exit(1);
    }
    return;
  }

  throw new Error('Unsupported import mode. Use --validate-only, --task-lists-only, --period-only, --objectives-only, --key-results-only, or --manifest.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
