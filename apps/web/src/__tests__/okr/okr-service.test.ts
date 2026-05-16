import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordActivity = vi.fn();
const insertValues = vi.fn();
const updateSet = vi.fn();
const updateWhere = vi.fn();
const updateReturning = vi.fn();
const periodsFindFirst = vi.fn();
const periodsFindMany = vi.fn();
const objectivesFindFirst = vi.fn();
const keyResultsFindFirst = vi.fn();
const txInsertValues = vi.fn();
const txUpdateSet = vi.fn();
const txUpdateWhere = vi.fn();
const txUpdateReturning = vi.fn();
const listTasksForKeyResult = vi.fn();
const getTaskProgressSnapshotForKeyResult = vi.fn();
const listTaskProgressSnapshotsForKeyResults = vi.fn();

vi.mock('@/lib/services/activity-service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/activity-service')>('@/lib/services/activity-service');
  return {
    ...actual,
    recordActivity: (...args: unknown[]) => recordActivity(...args),
  };
});

vi.mock('@/lib/services/task-service', () => ({
  listTasksForKeyResult: (...args: unknown[]) => listTasksForKeyResult(...args),
  getTaskProgressSnapshotForKeyResult: (...args: unknown[]) => getTaskProgressSnapshotForKeyResult(...args),
  listTaskProgressSnapshotsForKeyResults: (...args: unknown[]) => listTaskProgressSnapshotsForKeyResults(...args),
}));

vi.mock('@stride-os/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: (...args: unknown[]) => insertValues(...args),
    })),
    update: vi.fn(() => ({
      set: (...args: unknown[]) => updateSet(...args),
    })),
    query: {
      periods: {
        findMany: (...args: unknown[]) => periodsFindMany(...args),
        findFirst: (...args: unknown[]) => periodsFindFirst(...args),
      },
      objectives: {
        findFirst: (...args: unknown[]) => objectivesFindFirst(...args),
      },
      keyResults: {
        findFirst: (...args: unknown[]) => keyResultsFindFirst(...args),
      },
    },
    transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({
      insert: vi.fn(() => ({
        values: (...args: unknown[]) => txInsertValues(...args),
      })),
      update: vi.fn(() => ({
        set: (...args: unknown[]) => txUpdateSet(...args),
      })),
    }),
  },
  schema: {
    periods: { id: {}, startDate: {}, createdAt: {}, status: {} },
    objectives: { id: {}, sortOrder: {}, createdAt: {}, status: {} },
    keyResults: { id: {} },
    krCheckIns: { keyResultId: {}, createdAt: {} },
  },
}));

import { PERIOD_TYPES } from '@/lib/services/okr-service';
import { getPeriodTypeLabel } from '@/lib/presentation/labels';
import {
  archivePeriod,
  createKeyResult,
  createKrCheckIn,
  createObjective,
  createPeriod,
  listPeriods,
  updateKeyResult,
  updateObjective,
  updatePeriod,
} from '@/lib/services/okr-service';

describe('okr period rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordActivity.mockResolvedValue(undefined);
    insertValues.mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 'period_1', name: '2026 Q2', title: 'KR title', status: 'active' }]),
    });
    updateSet.mockReturnValue({
      where: (...args: unknown[]) => updateWhere(...args),
    });
    updateWhere.mockReturnValue({
      returning: (...args: unknown[]) => updateReturning(...args),
    });
    txInsertValues.mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 'checkin_1' }]),
    });
    txUpdateSet.mockReturnValue({
      where: (...args: unknown[]) => txUpdateWhere(...args),
    });
    txUpdateWhere.mockReturnValue({
      returning: (...args: unknown[]) => txUpdateReturning(...args),
    });
    listTasksForKeyResult.mockResolvedValue([]);
    getTaskProgressSnapshotForKeyResult.mockResolvedValue({
      keyResultId: 'kr_1',
      committedTaskCount: 0,
      completedCommittedTaskCount: 0,
      openCommittedTaskCount: 0,
      hasCommittedTasks: false,
      lastTaskProgressAt: null,
    });
    listTaskProgressSnapshotsForKeyResults.mockResolvedValue([]);
    periodsFindMany.mockResolvedValue([]);
  });

  it('supports month as a period type', () => {
    expect(PERIOD_TYPES).toContain('month');
  });

  it('labels month periods', () => {
    expect(getPeriodTypeLabel('month')).toBe('月度');
  });

  it('records period, objective, and key result activity with diffs', async () => {
    insertValues
      .mockReturnValueOnce({ returning: vi.fn().mockResolvedValue([{ id: 'period_1', name: '2026 Q2', type: 'quarter', startDate: '2026-04-01', endDate: '2026-06-30', status: 'active' }]) })
      .mockReturnValueOnce({ returning: vi.fn().mockResolvedValue([{ id: 'obj_1', title: 'Ship it', description: null, status: 'active', sortOrder: 0 }]) })
      .mockReturnValueOnce({ returning: vi.fn().mockResolvedValue([{ id: 'kr_1', title: 'Grow', description: 'desc', status: 'active' }]) });

    periodsFindFirst.mockResolvedValue({ id: 'period_1', name: '2026 Q2', type: 'quarter', startDate: '2026-04-01', endDate: '2026-06-30', status: 'active' });
    objectivesFindFirst.mockResolvedValue({ id: 'obj_1', title: 'Ship it', description: null, status: 'active', sortOrder: 0 });
    keyResultsFindFirst.mockResolvedValue({ id: 'kr_1', title: 'Grow', description: 'desc', status: 'active' });

    updateReturning
      .mockResolvedValueOnce([{ id: 'period_1', name: '2026 Q2 Updated', type: 'quarter', startDate: '2026-04-01', endDate: '2026-06-30', status: 'active' }])
      .mockResolvedValueOnce([{ id: 'period_1', name: '2026 Q2 Updated', type: 'quarter', startDate: '2026-04-01', endDate: '2026-06-30', status: 'archived' }])
      .mockResolvedValueOnce([{ id: 'obj_1', title: 'Ship better', description: 'desc', status: 'active', sortOrder: 1 }])
      .mockResolvedValueOnce([{ id: 'obj_1', title: 'Ship better', description: 'desc', status: 'archived', sortOrder: 1 }])
      .mockResolvedValueOnce([{ id: 'kr_1', title: 'Grow more', description: 'desc updated', status: 'active' }])
      .mockResolvedValueOnce([{ id: 'kr_1', title: 'Grow more', description: 'desc updated', status: 'archived' }]);

    await createPeriod({ name: '2026 Q2', type: 'quarter', startDate: '2026-04-01', endDate: '2026-06-30' }, {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });
    await updatePeriod('period_1', { name: '2026 Q2 Updated' }, {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });
    await archivePeriod('period_1', {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });

    await createObjective({ periodId: 'period_1', title: 'Ship it' }, {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });
    await updateObjective('obj_1', { title: 'Ship better', description: 'desc', sortOrder: 1 }, {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });
    await updateObjective('obj_1', { status: 'archived' }, {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });

    await createKeyResult({ objectiveId: 'obj_1', title: 'Grow', description: 'desc' }, {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });
    await updateKeyResult('kr_1', { title: 'Grow more', description: 'desc updated' }, {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });
    await updateKeyResult('kr_1', { status: 'archived' }, {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });

    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'okr.period.create' }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'okr.period.update',
      metadata: expect.objectContaining({ changedFields: expect.arrayContaining(['name']) }),
    }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'okr.period.archive' }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'okr.objective.create' }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'okr.objective.update' }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'okr.objective.archive' }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'okr.key_result.create' }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'okr.key_result.update' }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'okr.key_result.archive' }));
  });

  it('records check-in activity transactionally', async () => {
    keyResultsFindFirst.mockResolvedValue({
      id: 'kr_1',
      title: 'Grow',
      status: 'active',
      description: 'desc',
    });

    await createKrCheckIn({
      keyResultId: 'kr_1',
      summary: 'Moved forward',
      blockers: 'Need review',
      nextActions: 'Close remaining tasks',
    }, {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });

    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'okr.key_result.check_in',
      metadata: expect.objectContaining({
        summary: 'Moved forward',
        blockers: 'Need review',
        nextActions: 'Close remaining tasks',
      }),
    }));
  });

  it('treats stale check-ins with fresh committed-task progress as non-risk', async () => {
    const staleDate = new Date('2026-05-01T00:00:00.000Z');
    keyResultsFindFirst.mockResolvedValue(null);
    periodsFindFirst.mockResolvedValue(null);
    objectivesFindFirst.mockResolvedValue(null);
    (await import('@stride-os/db')).db.query.keyResults.findMany = vi.fn().mockResolvedValue([
      {
        id: 'kr_1',
        title: 'Grow',
        status: 'active',
        objective: { period: { name: '2026 Q2' } },
        checkIns: [{ summary: 'On track', blockers: null, nextActions: null, createdAt: staleDate }],
      },
    ]);
    listTaskProgressSnapshotsForKeyResults.mockResolvedValue([
      {
        keyResultId: 'kr_1',
        committedTaskCount: 3,
        completedCommittedTaskCount: 1,
        openCommittedTaskCount: 2,
        hasCommittedTasks: true,
        lastTaskProgressAt: new Date('2026-05-14T00:00:00.000Z'),
      },
    ]);

    const { listRiskKeyResults } = await import('@/lib/services/okr-service');
    const result = await listRiskKeyResults({ staleSince: new Date('2026-05-10T00:00:00.000Z') });

    expect(result).toEqual([]);
  });

  it('returns task progress and latest check-in metadata for risk results', async () => {
    const staleDate = new Date('2026-05-01T00:00:00.000Z');
    (await import('@stride-os/db')).db.query.keyResults.findMany = vi.fn().mockResolvedValue([
      {
        id: 'kr_1',
        title: 'Grow',
        status: 'at_risk',
        objective: { period: { name: '2026 Q2' } },
        checkIns: [{ summary: 'Blocked', blockers: null, nextActions: null, createdAt: staleDate }],
      },
    ]);
    listTaskProgressSnapshotsForKeyResults.mockResolvedValue([
      {
        keyResultId: 'kr_1',
        committedTaskCount: 4,
        completedCommittedTaskCount: 1,
        openCommittedTaskCount: 3,
        hasCommittedTasks: true,
        lastTaskProgressAt: new Date('2026-05-03T00:00:00.000Z'),
      },
    ]);

    const { listRiskKeyResults } = await import('@/lib/services/okr-service');
    const [risk] = await listRiskKeyResults({ staleSince: new Date('2026-05-10T00:00:00.000Z') });

    expect(risk).toMatchObject({
      id: 'kr_1',
      taskProgress: {
        committedTaskCount: 4,
        completedCommittedTaskCount: 1,
        openCommittedTaskCount: 3,
      },
      latestCheckIn: {
        hasCheckIn: true,
        summary: 'Blocked',
      },
    });
  });

  it('preserves distinct objectives when enriching period progress', async () => {
    periodsFindMany.mockResolvedValue([
      {
        id: 'period_1',
        name: '2026',
        type: 'year',
        status: 'active',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        objectives: [
          {
            id: 'objective_1',
            title: 'Objective One',
            description: null,
            sortOrder: 0,
            keyResults: [{
              id: 'kr_1',
              title: 'KR One',
              description: 'Result one',
              status: 'active',
              checkIns: [],
            }],
          },
          {
            id: 'objective_2',
            title: 'Objective Two',
            description: null,
            sortOrder: 1,
            keyResults: [{
              id: 'kr_2',
              title: 'KR Two',
              description: 'Result two',
              status: 'active',
              checkIns: [],
            }],
          },
        ],
      },
    ]);
    listTaskProgressSnapshotsForKeyResults.mockResolvedValue([
      {
        keyResultId: 'kr_1',
        committedTaskCount: 0,
        completedCommittedTaskCount: 0,
        openCommittedTaskCount: 0,
        hasCommittedTasks: false,
        lastTaskProgressAt: null,
      },
      {
        keyResultId: 'kr_2',
        committedTaskCount: 0,
        completedCommittedTaskCount: 0,
        openCommittedTaskCount: 0,
        hasCommittedTasks: false,
        lastTaskProgressAt: null,
      },
    ]);

    const [period] = await listPeriods();

    expect(period.objectives).toHaveLength(2);
    expect(period.objectives.map((objective) => objective.id)).toEqual(['objective_1', 'objective_2']);
    expect(period.objectives[0]?.keyResults[0]?.id).toBe('kr_1');
    expect(period.objectives[1]?.keyResults[0]?.id).toBe('kr_2');
  });
});
