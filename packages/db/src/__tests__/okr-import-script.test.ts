import { execSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const packageRoot = path.resolve(process.cwd(), 'packages/db');

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

describe('okr import validation-only script', () => {
  it('reports normalized annual import summary without touching the database', () => {
    const output = execSync('pnpm --filter @stride-os/db db:import-okr --validate-only', {
      cwd: packageRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    });

    const jsonStart = output.indexOf('{');
    expect(jsonStart).toBeGreaterThanOrEqual(0);

    const report = JSON.parse(output.slice(jsonStart)) as ValidationOnlyReport;

    expect(report.mode).toBe('validation-only');
    expect(report.ok).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.period).toEqual({
      name: '2026',
      type: 'year',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'active',
    });
    expect(report.summary).toEqual({
      taskListCount: 4,
      objectiveCount: 4,
      keyResultCount: 12,
    });
    expect(report.taskLists).toEqual(expect.arrayContaining([
      expect.objectContaining({
        slug: 'civil-service-exam',
        objectiveCount: 1,
        keyResultCount: 2,
      }),
      expect.objectContaining({
        slug: 'health-repair',
        objectiveCount: 1,
        keyResultCount: 4,
      }),
    ]));
  });
});
