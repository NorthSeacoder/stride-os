import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const packageRoot = path.resolve(process.cwd(), 'packages/db');
const databasePath = path.join(packageRoot, 'data', 'okr-import-period.sqlite');

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

function removeSqliteArtifacts() {
  for (const suffix of ['', '-shm', '-wal']) {
    fs.rmSync(`${databasePath}${suffix}`, { force: true });
  }
}

function parseJsonOutput(output: string) {
  const jsonStart = output.indexOf('{');
  expect(jsonStart).toBeGreaterThanOrEqual(0);
  return JSON.parse(output.slice(jsonStart)) as PeriodOnlyReport;
}

describe('okr import period-only mode', () => {
  it('upserts the annual period by name', () => {
    removeSqliteArtifacts();

    const envVars = {
      ...process.env,
      DATABASE_DRIVER: 'sqlite',
      DATABASE_URL: 'file:./packages/db/data/okr-import-period.sqlite',
    };

    const migrate = spawnSync('pnpm', ['--filter', '@stride-os/db', 'db:migrate'], {
      cwd: packageRoot,
      env: envVars,
      encoding: 'utf8',
    });
    expect(migrate.status).toBe(0);

    const firstRun = execSync('pnpm --filter @stride-os/db db:import-okr --period-only', {
      cwd: packageRoot,
      env: envVars,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const firstReport = parseJsonOutput(firstRun);

    expect(firstReport.ok).toBe(true);
    expect(firstReport.period).toEqual(expect.objectContaining({
      name: '2026',
      type: 'year',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'active',
      action: 'created',
    }));

    const secondRun = execSync('pnpm --filter @stride-os/db db:import-okr --period-only', {
      cwd: packageRoot,
      env: envVars,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const secondReport = parseJsonOutput(secondRun);

    expect(secondReport.ok).toBe(true);
    expect(secondReport.period).toEqual(expect.objectContaining({
      name: '2026',
      action: 'reused',
    }));

    removeSqliteArtifacts();
  });
});
