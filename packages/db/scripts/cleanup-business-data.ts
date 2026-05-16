import 'dotenv/config';
import { count, eq, ne } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db } from '../src/client';
import { env } from '../src/env';
import * as postgresSchema from '../src/schema/postgres';
import * as sqliteSchema from '../src/schema/sqlite';

type CleanupRow = {
  table: string;
  deleteScope: string;
  retainedScope: string;
  rowCount: number;
};

type CleanupReport = {
  mode: 'dry-run' | 'execute';
  databaseDriver: string;
  databaseLocation: string;
  cleanupTargets: CleanupRow[];
  retainedTargets: {
    users: number;
    sessions: number;
    apiTokens: number;
    auditLogs: number;
    systemTaskLists: number;
    inboxList: number;
  };
};

function parseArgs(argv: string[]) {
  return {
    dryRun: argv.includes('--dry-run') || (!argv.includes('--execute') && argv.length === 0),
    execute: argv.includes('--execute'),
    confirmed: argv.includes('--confirm-cleanup'),
  };
}

function getDatabaseLocation() {
  return env.databaseDriver === 'postgres'
    ? `schema ${env.databaseSchema}`
    : env.databaseUrl;
}

async function countSqliteRows(sqliteDb: BetterSQLite3Database<typeof sqliteSchema>) {
  const rows: CleanupRow[] = [];

  const pushCount = async (table: string, deleteScope: string, retainedScope: string, rowCountPromise: Promise<number>) => {
    rows.push({
      table,
      deleteScope,
      retainedScope,
      rowCount: await rowCountPromise,
    });
  };

  await pushCount(
    'review_kr_snapshots',
    'all rows',
    'none',
    sqliteDb.select({ value: count() }).from(sqliteSchema.reviewKrSnapshots).then((result) => result[0]?.value ?? 0),
  );
  await pushCount(
    'reviews',
    'all rows',
    'none',
    sqliteDb.select({ value: count() }).from(sqliteSchema.reviews).then((result) => result[0]?.value ?? 0),
  );
  await pushCount(
    'kr_check_ins',
    'all rows',
    'none',
    sqliteDb.select({ value: count() }).from(sqliteSchema.krCheckIns).then((result) => result[0]?.value ?? 0),
  );
  await pushCount(
    'task_kr_links',
    'all rows',
    'none',
    sqliteDb.select({ value: count() }).from(sqliteSchema.taskKrLinks).then((result) => result[0]?.value ?? 0),
  );
  await pushCount(
    'task_definition_kr_links',
    'all rows',
    'none',
    sqliteDb.select({ value: count() }).from(sqliteSchema.taskDefinitionKrLinks).then((result) => result[0]?.value ?? 0),
  );
  await pushCount(
    'tasks',
    'all rows',
    'none',
    sqliteDb.select({ value: count() }).from(sqliteSchema.tasks).then((result) => result[0]?.value ?? 0),
  );
  await pushCount(
    'task_definitions',
    'all rows',
    'none',
    sqliteDb.select({ value: count() }).from(sqliteSchema.taskDefinitions).then((result) => result[0]?.value ?? 0),
  );
  await pushCount(
    'key_results',
    'all rows',
    'none',
    sqliteDb.select({ value: count() }).from(sqliteSchema.keyResults).then((result) => result[0]?.value ?? 0),
  );
  await pushCount(
    'objectives',
    'all rows',
    'none',
    sqliteDb.select({ value: count() }).from(sqliteSchema.objectives).then((result) => result[0]?.value ?? 0),
  );
  await pushCount(
    'periods',
    'all rows',
    'none',
    sqliteDb.select({ value: count() }).from(sqliteSchema.periods).then((result) => result[0]?.value ?? 0),
  );
  await pushCount(
    'example_items',
    'all rows',
    'none',
    sqliteDb.select({ value: count() }).from(sqliteSchema.exampleItems).then((result) => result[0]?.value ?? 0),
  );
  await pushCount(
    'task_lists',
    "rows where kind != 'system'",
    "rows where kind = 'system' (notably slug = 'inbox')",
    sqliteDb.select({ value: count() }).from(sqliteSchema.taskLists).where(ne(sqliteSchema.taskLists.kind, 'system')).then((result) => result[0]?.value ?? 0),
  );

  return rows;
}

async function countPostgresRows(postgresDb: NodePgDatabase<typeof postgresSchema>) {
  const rows: CleanupRow[] = [];

  const pushCount = async (table: string, deleteScope: string, retainedScope: string, rowCountPromise: Promise<number>) => {
    rows.push({
      table,
      deleteScope,
      retainedScope,
      rowCount: await rowCountPromise,
    });
  };

  await pushCount(
    'review_kr_snapshots',
    'all rows',
    'none',
    postgresDb.select({ value: count() }).from(postgresSchema.reviewKrSnapshots).then((result) => Number(result[0]?.value ?? 0)),
  );
  await pushCount(
    'reviews',
    'all rows',
    'none',
    postgresDb.select({ value: count() }).from(postgresSchema.reviews).then((result) => Number(result[0]?.value ?? 0)),
  );
  await pushCount(
    'kr_check_ins',
    'all rows',
    'none',
    postgresDb.select({ value: count() }).from(postgresSchema.krCheckIns).then((result) => Number(result[0]?.value ?? 0)),
  );
  await pushCount(
    'task_kr_links',
    'all rows',
    'none',
    postgresDb.select({ value: count() }).from(postgresSchema.taskKrLinks).then((result) => Number(result[0]?.value ?? 0)),
  );
  await pushCount(
    'task_definition_kr_links',
    'all rows',
    'none',
    postgresDb.select({ value: count() }).from(postgresSchema.taskDefinitionKrLinks).then((result) => Number(result[0]?.value ?? 0)),
  );
  await pushCount(
    'tasks',
    'all rows',
    'none',
    postgresDb.select({ value: count() }).from(postgresSchema.tasks).then((result) => Number(result[0]?.value ?? 0)),
  );
  await pushCount(
    'task_definitions',
    'all rows',
    'none',
    postgresDb.select({ value: count() }).from(postgresSchema.taskDefinitions).then((result) => Number(result[0]?.value ?? 0)),
  );
  await pushCount(
    'key_results',
    'all rows',
    'none',
    postgresDb.select({ value: count() }).from(postgresSchema.keyResults).then((result) => Number(result[0]?.value ?? 0)),
  );
  await pushCount(
    'objectives',
    'all rows',
    'none',
    postgresDb.select({ value: count() }).from(postgresSchema.objectives).then((result) => Number(result[0]?.value ?? 0)),
  );
  await pushCount(
    'periods',
    'all rows',
    'none',
    postgresDb.select({ value: count() }).from(postgresSchema.periods).then((result) => Number(result[0]?.value ?? 0)),
  );
  await pushCount(
    'example_items',
    'all rows',
    'none',
    postgresDb.select({ value: count() }).from(postgresSchema.exampleItems).then((result) => Number(result[0]?.value ?? 0)),
  );
  await pushCount(
    'task_lists',
    "rows where kind != 'system'",
    "rows where kind = 'system' (notably slug = 'inbox')",
    postgresDb.select({ value: count() }).from(postgresSchema.taskLists).where(ne(postgresSchema.taskLists.kind, 'system')).then((result) => Number(result[0]?.value ?? 0)),
  );

  return rows;
}

async function countRetainedRows() {
  if (env.databaseDriver === 'sqlite') {
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;
    const [users, sessions, apiTokens, auditLogs, systemTaskLists, inboxList] = await Promise.all([
      sqliteDb.select({ value: count() }).from(sqliteSchema.users),
      sqliteDb.select({ value: count() }).from(sqliteSchema.sessions),
      sqliteDb.select({ value: count() }).from(sqliteSchema.apiTokens),
      sqliteDb.select({ value: count() }).from(sqliteSchema.auditLogs),
      sqliteDb.select({ value: count() }).from(sqliteSchema.taskLists).where(eq(sqliteSchema.taskLists.kind, 'system')),
      sqliteDb.select({ value: count() }).from(sqliteSchema.taskLists).where(eq(sqliteSchema.taskLists.slug, 'inbox')),
    ]);

    return {
      users: users[0]?.value ?? 0,
      sessions: sessions[0]?.value ?? 0,
      apiTokens: apiTokens[0]?.value ?? 0,
      auditLogs: auditLogs[0]?.value ?? 0,
      systemTaskLists: systemTaskLists[0]?.value ?? 0,
      inboxList: inboxList[0]?.value ?? 0,
    };
  }

  const postgresDb = db as NodePgDatabase<typeof postgresSchema>;
  const [users, sessions, apiTokens, auditLogs, systemTaskLists, inboxList] = await Promise.all([
    postgresDb.select({ value: count() }).from(postgresSchema.users),
    postgresDb.select({ value: count() }).from(postgresSchema.sessions),
    postgresDb.select({ value: count() }).from(postgresSchema.apiTokens),
    postgresDb.select({ value: count() }).from(postgresSchema.auditLogs),
    postgresDb.select({ value: count() }).from(postgresSchema.taskLists).where(eq(postgresSchema.taskLists.kind, 'system')),
    postgresDb.select({ value: count() }).from(postgresSchema.taskLists).where(eq(postgresSchema.taskLists.slug, 'inbox')),
  ]);

  return {
    users: Number(users[0]?.value ?? 0),
    sessions: Number(sessions[0]?.value ?? 0),
    apiTokens: Number(apiTokens[0]?.value ?? 0),
    auditLogs: Number(auditLogs[0]?.value ?? 0),
    systemTaskLists: Number(systemTaskLists[0]?.value ?? 0),
    inboxList: Number(inboxList[0]?.value ?? 0),
  };
}

async function buildCleanupReport(mode: CleanupReport['mode']): Promise<CleanupReport> {
  const cleanupTargets = env.databaseDriver === 'sqlite'
    ? await countSqliteRows(db as BetterSQLite3Database<typeof sqliteSchema>)
    : await countPostgresRows(db as NodePgDatabase<typeof postgresSchema>);
  const retainedTargets = await countRetainedRows();

  return {
    mode,
    databaseDriver: env.databaseDriver,
    databaseLocation: getDatabaseLocation(),
    cleanupTargets,
    retainedTargets,
  };
}

async function executeSqliteCleanup(sqliteDb: BetterSQLite3Database<typeof sqliteSchema>) {
  sqliteDb.transaction((tx) => {
    tx.delete(sqliteSchema.reviewKrSnapshots).run();
    tx.delete(sqliteSchema.reviews).run();
    tx.delete(sqliteSchema.krCheckIns).run();
    tx.delete(sqliteSchema.taskKrLinks).run();
    tx.delete(sqliteSchema.taskDefinitionKrLinks).run();
    tx.delete(sqliteSchema.tasks).run();
    tx.delete(sqliteSchema.taskDefinitions).run();
    tx.delete(sqliteSchema.keyResults).run();
    tx.delete(sqliteSchema.objectives).run();
    tx.delete(sqliteSchema.periods).run();
    tx.delete(sqliteSchema.exampleItems).run();
    tx.delete(sqliteSchema.taskLists).where(ne(sqliteSchema.taskLists.kind, 'system')).run();
  });
}

async function executePostgresCleanup(postgresDb: NodePgDatabase<typeof postgresSchema>) {
  await postgresDb.transaction(async (tx) => {
    await tx.delete(postgresSchema.reviewKrSnapshots);
    await tx.delete(postgresSchema.reviews);
    await tx.delete(postgresSchema.krCheckIns);
    await tx.delete(postgresSchema.taskKrLinks);
    await tx.delete(postgresSchema.taskDefinitionKrLinks);
    await tx.delete(postgresSchema.tasks);
    await tx.delete(postgresSchema.taskDefinitions);
    await tx.delete(postgresSchema.keyResults);
    await tx.delete(postgresSchema.objectives);
    await tx.delete(postgresSchema.periods);
    await tx.delete(postgresSchema.exampleItems);
    await tx.delete(postgresSchema.taskLists).where(ne(postgresSchema.taskLists.kind, 'system'));
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.execute && !args.confirmed) {
    throw new Error('Refusing to delete data without --confirm-cleanup.');
  }

  if (args.execute) {
    if (env.databaseDriver === 'sqlite') {
      await executeSqliteCleanup(db as BetterSQLite3Database<typeof sqliteSchema>);
    } else {
      await executePostgresCleanup(db as NodePgDatabase<typeof postgresSchema>);
    }

    console.log(JSON.stringify(await buildCleanupReport('execute'), null, 2));
    return;
  }

  if (!args.dryRun) {
    throw new Error('Unknown cleanup mode. Use --dry-run or --execute --confirm-cleanup.');
  }

  console.log(JSON.stringify(await buildCleanupReport('dry-run'), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
