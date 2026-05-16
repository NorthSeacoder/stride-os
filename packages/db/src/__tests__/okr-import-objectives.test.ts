import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const packageRoot = path.resolve(process.cwd(), 'packages/db');
const databasePath = path.join(packageRoot, 'data', 'okr-import-objectives.sqlite');

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

function removeSqliteArtifacts() {
  for (const suffix of ['', '-shm', '-wal']) {
    fs.rmSync(`${databasePath}${suffix}`, { force: true });
  }
}

function parseJsonOutput(output: string) {
  const jsonStart = output.indexOf('{');
  expect(jsonStart).toBeGreaterThanOrEqual(0);
  return JSON.parse(output.slice(jsonStart)) as ObjectivesOnlyReport;
}

describe('okr import objectives-only mode', () => {
  it('upserts objectives under the imported annual period', () => {
    removeSqliteArtifacts();

    const envVars = {
      ...process.env,
      DATABASE_DRIVER: 'sqlite',
      DATABASE_URL: 'file:./packages/db/data/okr-import-objectives.sqlite',
    };

    const migrate = spawnSync('pnpm', ['--filter', '@stride-os/db', 'db:migrate'], {
      cwd: packageRoot,
      env: envVars,
      encoding: 'utf8',
    });
    expect(migrate.status).toBe(0);

    const periodRun = execSync('pnpm --filter @stride-os/db db:import-okr --period-only', {
      cwd: packageRoot,
      env: envVars,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    expect(periodRun).toContain('"mode": "period-only"');

    const firstRun = execSync('pnpm --filter @stride-os/db db:import-okr --objectives-only', {
      cwd: packageRoot,
      env: envVars,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const firstReport = parseJsonOutput(firstRun);

    expect(firstReport.ok).toBe(true);
    expect(firstReport.periodId).toBeTruthy();
    expect(firstReport.summary).toEqual({
      objectiveCount: 4,
      created: 4,
      updated: 0,
      reused: 0,
    });
    expect(firstReport.taskLists).toEqual(expect.arrayContaining([
      expect.objectContaining({
        slug: 'civil-service-exam',
        objectives: [
          expect.objectContaining({
            refId: 'O1-civil-service-study-rhythm',
            action: 'created',
          }),
        ],
      }),
      expect.objectContaining({
        slug: 'health-repair',
      }),
    ]));

    const secondRun = execSync('pnpm --filter @stride-os/db db:import-okr --objectives-only', {
      cwd: packageRoot,
      env: envVars,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const secondReport = parseJsonOutput(secondRun);

    expect(secondReport.ok).toBe(true);
    expect(secondReport.summary).toEqual({
      objectiveCount: 4,
      created: 0,
      updated: 0,
      reused: 4,
    });

    removeSqliteArtifacts();
  });
});
