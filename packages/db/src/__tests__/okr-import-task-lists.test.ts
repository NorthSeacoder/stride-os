import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const packageRoot = path.resolve(process.cwd(), 'packages/db');
const databasePath = path.join(packageRoot, 'data', 'okr-import-task-lists.sqlite');

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

function removeSqliteArtifacts() {
  for (const suffix of ['', '-shm', '-wal']) {
    fs.rmSync(`${databasePath}${suffix}`, { force: true });
  }
}

function parseJsonOutput(output: string) {
  const jsonStart = output.indexOf('{');
  expect(jsonStart).toBeGreaterThanOrEqual(0);
  return JSON.parse(output.slice(jsonStart)) as TaskListsOnlyReport;
}

describe('okr import task-lists-only mode', () => {
  it('upserts user task lists without touching deeper OKR entities', () => {
    removeSqliteArtifacts();

    const envVars = {
      ...process.env,
      DATABASE_DRIVER: 'sqlite',
      DATABASE_URL: 'file:./packages/db/data/okr-import-task-lists.sqlite',
    };

    const migrate = spawnSync('pnpm', ['--filter', '@stride-os/db', 'db:migrate'], {
      cwd: packageRoot,
      env: envVars,
      encoding: 'utf8',
    });
    expect(migrate.status).toBe(0);

    const seed = spawnSync('pnpm', ['--filter', '@stride-os/db', 'db:seed'], {
      cwd: packageRoot,
      env: envVars,
      encoding: 'utf8',
    });
    expect(seed.status).toBe(0);

    const firstRun = execSync('pnpm --filter @stride-os/db db:import-okr --task-lists-only', {
      cwd: packageRoot,
      env: envVars,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const firstReport = parseJsonOutput(firstRun);

    expect(firstReport.ok).toBe(true);
    expect(firstReport.summary).toEqual({
      taskListCount: 4,
      created: 4,
      updated: 0,
      reused: 0,
    });
    expect(firstReport.taskLists.map((item) => item.slug)).toEqual([
      'civil-service-exam',
      'health-repair',
      'content-business',
      'personal-operations',
    ]);

    const secondRun = execSync('pnpm --filter @stride-os/db db:import-okr --task-lists-only', {
      cwd: packageRoot,
      env: envVars,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const secondReport = parseJsonOutput(secondRun);

    expect(secondReport.ok).toBe(true);
    expect(secondReport.summary).toEqual({
      taskListCount: 4,
      created: 0,
      updated: 0,
      reused: 4,
    });

    removeSqliteArtifacts();
  });
});
