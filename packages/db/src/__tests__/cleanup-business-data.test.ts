import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const packageRoot = path.resolve(process.cwd(), 'packages/db');
const cleanupDatabasePath = path.join(packageRoot, 'data', 'cleanup-test.sqlite');

type CleanupReport = {
  mode: string;
  databaseDriver: string;
  databaseLocation: string;
  cleanupTargets: Array<{
    table: string;
    deleteScope: string;
    retainedScope: string;
    rowCount: number;
  }>;
  retainedTargets: {
    users: number;
    sessions: number;
    apiTokens: number;
    auditLogs: number;
    systemTaskLists: number;
    inboxList: number;
  };
};

function removeCleanupArtifacts() {
  for (const suffix of ['', '-shm', '-wal']) {
    fs.rmSync(`${cleanupDatabasePath}${suffix}`, { force: true });
  }
}

function parseJsonOutput(output: string) {
  const jsonStart = output.indexOf('{');
  expect(jsonStart).toBeGreaterThanOrEqual(0);
  return JSON.parse(output.slice(jsonStart)) as CleanupReport;
}

function runCommand(
  command: string,
  args: string[],
  options?: { env?: NodeJS.ProcessEnv },
) {
  return spawnSync(command, args, {
    cwd: packageRoot,
    env: options?.env,
    encoding: 'utf8',
  });
}

describe('cleanup-business-data dry-run', () => {
  it('reports cleanup and retained scopes without deleting data', () => {
    const output = execSync('pnpm --filter @stride-os/db db:cleanup-business-data', {
      cwd: packageRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    });

    const report = parseJsonOutput(output);

    expect(report.mode).toBe('dry-run');
    expect(report.databaseDriver).toMatch(/sqlite|postgres/);
    expect(report.databaseLocation.length).toBeGreaterThan(0);

    expect(report.cleanupTargets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        table: 'periods',
        deleteScope: 'all rows',
      }),
      expect.objectContaining({
        table: 'task_lists',
        deleteScope: "rows where kind != 'system'",
        retainedScope: "rows where kind = 'system' (notably slug = 'inbox')",
      }),
      expect.objectContaining({
        table: 'example_items',
        deleteScope: 'all rows',
      }),
    ]));

    expect(report.retainedTargets).toEqual(expect.objectContaining({
      users: expect.any(Number),
      sessions: expect.any(Number),
      apiTokens: expect.any(Number),
      auditLogs: expect.any(Number),
      systemTaskLists: expect.any(Number),
      inboxList: expect.any(Number),
    }));
  });

  it('refuses execute mode without explicit confirmation', () => {
    const result = runCommand('node', ['--import', 'tsx', 'scripts/cleanup-business-data.ts', '--execute']);

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain('Refusing to delete data without --confirm-cleanup.');
  });

  it('cleans only business data in a disposable sqlite database when confirmed', () => {
    removeCleanupArtifacts();

    const envVars = {
      ...process.env,
      DATABASE_DRIVER: 'sqlite',
      DATABASE_URL: 'file:./packages/db/data/cleanup-test.sqlite',
    };

    const migrate = runCommand('pnpm', ['--filter', '@stride-os/db', 'db:migrate'], { env: envVars });
    expect(migrate.status).toBe(0);

    const seed = runCommand('pnpm', ['--filter', '@stride-os/db', 'db:seed'], { env: envVars });
    expect(seed.status).toBe(0);

    const seedScript = [
      "const Database=require('better-sqlite3');",
      `const db=new Database(${JSON.stringify(cleanupDatabasePath)});`,
      "const user=db.prepare(\"select id from users limit 1\").get();",
      "db.prepare(\"insert into example_items (id,title,status,created_at,updated_at) values (?,?,?,?,?)\").run('example-1','Example','active',Date.now(),Date.now());",
      "db.prepare(\"insert into periods (id,name,type,start_date,end_date,status,created_at,updated_at) values (?,?,?,?,?,?,?,?)\").run('period-1','2026','year','2026-01-01','2026-12-31','active',Date.now(),Date.now());",
      "db.prepare(\"insert into objectives (id,period_id,title,status,sort_order,created_at,updated_at) values (?,?,?,?,?,?,?)\").run('objective-1','period-1','Objective','active',1,Date.now(),Date.now());",
      "db.prepare(\"insert into key_results (id,objective_id,title,description,status,created_at,updated_at) values (?,?,?,?,?,?,?)\").run('kr-1','objective-1','KR','Result','active',Date.now(),Date.now());",
      "db.prepare(\"insert into kr_check_ins (id,key_result_id,summary,created_at) values (?,?,?,?)\").run('checkin-1','kr-1','Checked in',Date.now());",
      "db.prepare(\"insert into task_lists (id,name,kind,slug,sort_order,created_at,updated_at) values (?,?,?,?,?,?,?)\").run('user-list-1','User List','user','user-list',1,Date.now(),Date.now());",
      "db.prepare(\"insert into task_definitions (id,title,list_id,frequency,end_type,created_at,updated_at) values (?,?,?,?,?,?,?)\").run('definition-1','Definition','user-list-1','daily','never',Date.now(),Date.now());",
      "db.prepare(\"insert into tasks (id,title,status,list_id,created_at,updated_at) values (?,?,?,?,?,?)\").run('task-1','Task','inbox','user-list-1',Date.now(),Date.now());",
      "db.prepare(\"insert into task_definition_kr_links (definition_id,key_result_id,counts_toward_commitment,created_at) values (?,?,?,?)\").run('definition-1','kr-1',1,Date.now());",
      "db.prepare(\"insert into task_kr_links (task_id,key_result_id,counts_toward_commitment,created_at) values (?,?,?,?)\").run('task-1','kr-1',1,Date.now());",
      "db.prepare(\"insert into reviews (id,type,period_start,period_end,status,title,body,created_at,updated_at) values (?,?,?,?,?,?,?,?,?)\").run('review-1','weekly','2026-05-11','2026-05-17','draft','Review','Body',Date.now(),Date.now());",
      "db.prepare(\"insert into review_kr_snapshots (id,review_id,key_result_id,snapshot,created_at) values (?,?,?,?,?)\").run('snapshot-1','review-1','kr-1','{}',Date.now());",
      "db.close();",
    ].join('');

    const seedResult = runCommand('node', ['-e', seedScript], { env: envVars });
    expect(seedResult.status).toBe(0);

    const execute = runCommand(
      'node',
      ['--import', 'tsx', 'scripts/cleanup-business-data.ts', '--execute', '--confirm-cleanup'],
      { env: envVars },
    );
    expect(execute.status).toBe(0);

    const report = parseJsonOutput(execute.stdout);

    expect(report.mode).toBe('execute');
    expect(report.cleanupTargets.every((row) => row.rowCount === 0)).toBe(true);
    expect(report.retainedTargets.users).toBeGreaterThanOrEqual(1);
    expect(report.retainedTargets.apiTokens).toBeGreaterThanOrEqual(0);

    removeCleanupArtifacts();
  });
});
