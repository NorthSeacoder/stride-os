import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

const packageRoot = path.resolve(process.cwd(), 'packages/db');
const databasePath = path.join(packageRoot, 'data', 'okr-import-e2e.sqlite');
const manifestPath = path.join(packageRoot, 'data', 'okr-import-e2e-manifest.json');

type Manifest = {
  period: { id: string; name: string };
  taskLists: Array<{
    slug: string;
    id: string;
    objectives: Array<{
      refId: string;
      objectiveId: string;
      keyResults: Array<{
        refId: string;
        keyResultId: string;
      }>;
    }>;
  }>;
};

function removeArtifacts() {
  for (const suffix of ['', '-shm', '-wal']) {
    fs.rmSync(`${databasePath}${suffix}`, { force: true });
  }
  fs.rmSync(manifestPath, { force: true });
}

function countRows(dbFile: string, table: string) {
  const sqlite = new Database(dbFile, { readonly: true });
  try {
    const row = sqlite.prepare(`select count(*) as count from ${table}`).get() as { count: number };
    return row.count;
  } finally {
    sqlite.close();
  }
}

describe('okr import e2e flow', () => {
  it('runs the full annual import flow and leaves consistent ids in sqlite and manifest', () => {
    removeArtifacts();

    const envVars = {
      ...process.env,
      DATABASE_DRIVER: 'sqlite',
      DATABASE_URL: 'file:./packages/db/data/okr-import-e2e.sqlite',
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

    const commands = [
      'pnpm --filter @stride-os/db db:import-okr --validate-only',
      'pnpm --filter @stride-os/db db:import-okr --task-lists-only',
      'pnpm --filter @stride-os/db db:import-okr --period-only',
      'pnpm --filter @stride-os/db db:import-okr --objectives-only',
      'pnpm --filter @stride-os/db db:import-okr --key-results-only',
      `pnpm --filter @stride-os/db db:import-okr --manifest --manifest=${manifestPath}`,
    ];

    for (const command of commands) {
      const output = execSync(command, {
        cwd: packageRoot,
        env: envVars,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      expect(output).toContain('"ok": true');
    }

    expect(countRows(databasePath, 'task_lists')).toBe(5);
    expect(countRows(databasePath, 'periods')).toBe(1);
    expect(countRows(databasePath, 'objectives')).toBe(4);
    expect(countRows(databasePath, 'key_results')).toBe(12);

    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Manifest;

    expect(manifest.period.name).toBe('2026');
    expect(manifest.period.id).toBeTruthy();
    expect(manifest.taskLists).toHaveLength(4);
    expect(manifest.taskLists.every((taskList) => Boolean(taskList.id))).toBe(true);
    expect(manifest.taskLists.every((taskList) => taskList.objectives.length === 1)).toBe(true);
    expect(
      manifest.taskLists.every((taskList) =>
        taskList.objectives.every((objective) =>
          Boolean(objective.objectiveId) && objective.keyResults.length > 0 &&
          objective.keyResults.every((keyResult) => Boolean(keyResult.keyResultId)))),
    ).toBe(true);

    removeArtifacts();
  });
});
