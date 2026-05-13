import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordActivity = vi.fn();
const insertValues = vi.fn();
const updateSet = vi.fn();
const updateWhere = vi.fn();
const updateReturning = vi.fn();
const periodsFindFirst = vi.fn();
const objectivesFindFirst = vi.fn();
const keyResultsFindFirst = vi.fn();
const txInsertValues = vi.fn();
const txUpdateSet = vi.fn();
const txUpdateWhere = vi.fn();
const txUpdateReturning = vi.fn();

vi.mock('@/lib/services/activity-service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/activity-service')>('@/lib/services/activity-service');
  return {
    ...actual,
    recordActivity: (...args: unknown[]) => recordActivity(...args),
  };
});

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
      .mockReturnValueOnce({ returning: vi.fn().mockResolvedValue([{ id: 'kr_1', title: 'Grow', type: 'numeric', targetValue: 10, currentValue: 1, unit: '%', status: 'active', confidence: 'low' }]) });

    periodsFindFirst.mockResolvedValue({ id: 'period_1', name: '2026 Q2', type: 'quarter', startDate: '2026-04-01', endDate: '2026-06-30', status: 'active' });
    objectivesFindFirst.mockResolvedValue({ id: 'obj_1', title: 'Ship it', description: null, status: 'active', sortOrder: 0 });
    keyResultsFindFirst.mockResolvedValue({ id: 'kr_1', title: 'Grow', type: 'numeric', targetValue: 10, currentValue: 1, unit: '%', status: 'active', confidence: 'low' });

    updateReturning
      .mockResolvedValueOnce([{ id: 'period_1', name: '2026 Q2 Updated', type: 'quarter', startDate: '2026-04-01', endDate: '2026-06-30', status: 'active' }])
      .mockResolvedValueOnce([{ id: 'period_1', name: '2026 Q2 Updated', type: 'quarter', startDate: '2026-04-01', endDate: '2026-06-30', status: 'archived' }])
      .mockResolvedValueOnce([{ id: 'obj_1', title: 'Ship better', description: 'desc', status: 'active', sortOrder: 1 }])
      .mockResolvedValueOnce([{ id: 'obj_1', title: 'Ship better', description: 'desc', status: 'archived', sortOrder: 1 }])
      .mockResolvedValueOnce([{ id: 'kr_1', title: 'Grow more', type: 'numeric', targetValue: 20, currentValue: 5, unit: '%', status: 'active', confidence: 'medium' }])
      .mockResolvedValueOnce([{ id: 'kr_1', title: 'Grow more', type: 'numeric', targetValue: 20, currentValue: 5, unit: '%', status: 'archived', confidence: 'medium' }]);

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

    await createKeyResult({ objectiveId: 'obj_1', title: 'Grow', type: 'numeric', targetValue: 10, currentValue: 1, unit: '%', confidence: 'low' }, {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });
    await updateKeyResult('kr_1', { title: 'Grow more', targetValue: 20, currentValue: 5, confidence: 'medium' }, {
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

  it('records check-in activity transactionally with progress diff', async () => {
    keyResultsFindFirst.mockResolvedValue({
      id: 'kr_1',
      title: 'Grow',
      type: 'numeric',
      targetValue: 10,
      currentValue: 1,
      unit: '%',
      status: 'active',
      confidence: 'low',
    });
    txUpdateReturning.mockResolvedValue([{
      id: 'kr_1',
      title: 'Grow',
      type: 'numeric',
      targetValue: 10,
      currentValue: 5,
      unit: '%',
      status: 'active',
      confidence: 'high',
    }]);

    await createKrCheckIn({
      keyResultId: 'kr_1',
      progressValue: 5,
      confidence: 'high',
      summary: 'Moved forward',
    }, {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });

    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'okr.key_result.check_in',
      metadata: expect.objectContaining({
        changedFields: expect.arrayContaining(['currentValue', 'confidence']),
        progressValue: 5,
        confidence: 'high',
      }),
    }));
  });
});
