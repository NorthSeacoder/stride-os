import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const packageRoot = path.resolve(process.cwd(), 'packages/db');
const databasePath = path.join(packageRoot, 'data', 'okr-import-key-results.sqlite');

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

function removeSqliteArtifacts() {
  for (const suffix of ['', '-shm', '-wal']) {
    fs.rmSync(`${databasePath}${suffix}`, { force: true });
  }
}

function parseJsonOutput(output: string) {
  const jsonStart = output.indexOf('{');
  expect(jsonStart).toBeGreaterThanOrEqual(0);
  return JSON.parse(output.slice(jsonStart)) as KeyResultsOnlyReport;
}

describe('okr import key-results-only mode', () => {
  it('upserts key results under imported objectives', { timeout: 15000 }, () => {
    removeSqliteArtifacts();

    const envVars = {
      ...process.env,
      DATABASE_DRIVER: 'sqlite',
      DATABASE_URL: 'file:./packages/db/data/okr-import-key-results.sqlite',
    };

    const migrate = spawnSync('pnpm', ['--filter', '@stride-os/db', 'db:migrate'], {
      cwd: packageRoot,
      env: envVars,
      encoding: 'utf8',
    });
    expect(migrate.status).toBe(0);

    execSync('pnpm --filter @stride-os/db db:import-okr --period-only', {
      cwd: packageRoot,
      env: envVars,
      encoding: 'utf8',
      stdio: 'pipe',
    });

    execSync('pnpm --filter @stride-os/db db:import-okr --objectives-only', {
      cwd: packageRoot,
      env: envVars,
      encoding: 'utf8',
      stdio: 'pipe',
    });

    const firstRun = execSync('pnpm --filter @stride-os/db db:import-okr --key-results-only', {
      cwd: packageRoot,
      env: envVars,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const firstReport = parseJsonOutput(firstRun);

    expect(firstReport.ok).toBe(true);
    expect(firstReport.summary).toEqual({
      keyResultCount: 12,
      created: 12,
      updated: 0,
      reused: 0,
    });
    expect(firstReport.objectives).toEqual(expect.arrayContaining([
      expect.objectContaining({
        objectiveRefId: 'O1-civil-service-study-rhythm',
        keyResults: [
          expect.objectContaining({
            refId: 'O1-KR1-effective-study-days',
            action: 'created',
          }),
          expect.objectContaining({
            refId: 'O1-KR2-study-phase-plan',
            action: 'created',
          }),
        ],
      }),
    ]));

    const secondRun = execSync('pnpm --filter @stride-os/db db:import-okr --key-results-only', {
      cwd: packageRoot,
      env: envVars,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const secondReport = parseJsonOutput(secondRun);

    expect(secondReport.ok).toBe(true);
    expect(secondReport.summary).toEqual({
      keyResultCount: 12,
      created: 0,
      updated: 0,
      reused: 12,
    });

    removeSqliteArtifacts();
  });
});
