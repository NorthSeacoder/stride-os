import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const packageRoot = path.resolve(process.cwd(), 'packages/db');
const databasePath = path.join(packageRoot, 'data', 'okr-import-manifest.sqlite');
const manifestPath = path.join(packageRoot, 'data', 'okr-import-manifest.json');

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

function removeArtifacts() {
  for (const suffix of ['', '-shm', '-wal']) {
    fs.rmSync(`${databasePath}${suffix}`, { force: true });
  }
  fs.rmSync(manifestPath, { force: true });
}

function parseJsonOutput(output: string) {
  const jsonStart = output.indexOf('{');
  expect(jsonStart).toBeGreaterThanOrEqual(0);
  return JSON.parse(output.slice(jsonStart)) as ManifestReport;
}

describe('okr import manifest mode', () => {
  it('writes a layered manifest file with task list, objective, and key result ids', () => {
    removeArtifacts();

    const envVars = {
      ...process.env,
      DATABASE_DRIVER: 'sqlite',
      DATABASE_URL: 'file:./packages/db/data/okr-import-manifest.sqlite',
    };

    const migrate = spawnSync('pnpm', ['--filter', '@stride-os/db', 'db:migrate'], {
      cwd: packageRoot,
      env: envVars,
      encoding: 'utf8',
    });
    expect(migrate.status).toBe(0);

    const output = execSync(
      `pnpm --filter @stride-os/db db:import-okr --manifest --manifest=${manifestPath}`,
      {
        cwd: packageRoot,
        env: envVars,
        encoding: 'utf8',
        stdio: 'pipe',
      },
    );
    const report = parseJsonOutput(output);

    expect(report.ok).toBe(true);
    expect(report.summary).toEqual({
      taskListCount: 4,
      objectiveCount: 4,
      keyResultCount: 12,
    });
    expect(report.manifestPath).toBe(manifestPath);
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      period: { id: string; name: string };
      taskLists: Array<{
        slug: string;
        id: string;
        objectives: Array<{
          refId: string;
          objectiveId: string;
          keyResults: Array<{ refId: string; keyResultId: string }>;
        }>;
      }>;
    };

    expect(manifest.period.name).toBe('2026');
    expect(manifest.period.id).toBeTruthy();
    expect(manifest.taskLists).toHaveLength(4);
    expect(manifest.taskLists[0]?.id).toBeTruthy();
    expect(manifest.taskLists[0]?.objectives[0]?.objectiveId).toBeTruthy();
    expect(manifest.taskLists[0]?.objectives[0]?.keyResults[0]?.keyResultId).toBeTruthy();

    removeArtifacts();
  });
});
