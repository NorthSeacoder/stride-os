import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordActivity = vi.fn();
const ensureTodayRecurringTasks = vi.fn();
const listCompletedTasksBetween = vi.fn();
const listOpenTodayDueTasks = vi.fn();
const listTaskProgressSnapshotsForKeyResults = vi.fn();
const listCheckInsInRange = vi.fn();
const listKeyResultsByIds = vi.fn();

const {
  reviewsFindFirst,
  reviewsFindMany,
  keyResultsFindMany,
  updateReviewSet,
  updateReviewWhere,
  updateReviewReturning,
  insertReviewValues,
  insertReviewReturning,
  deleteSnapshotWhere,
  insertSnapshotValues,
  finalizeUpdateSet,
  finalizeUpdateWhere,
  finalizeUpdateReturning,
  mockedSchema,
} = vi.hoisted(() => ({
  reviewsFindFirst: vi.fn(),
  reviewsFindMany: vi.fn(),
  keyResultsFindMany: vi.fn(),
  updateReviewSet: vi.fn(),
  updateReviewWhere: vi.fn(),
  updateReviewReturning: vi.fn(),
  insertReviewValues: vi.fn(),
  insertReviewReturning: vi.fn(),
  deleteSnapshotWhere: vi.fn(),
  insertSnapshotValues: vi.fn(),
  finalizeUpdateSet: vi.fn(),
  finalizeUpdateWhere: vi.fn(),
  finalizeUpdateReturning: vi.fn(),
  mockedSchema: {
    reviews: {
      archivedAt: {},
      id: {},
      periodEnd: {},
      periodStart: {},
      status: {},
      type: {},
      updatedAt: {},
    },
    reviewKrSnapshots: {},
    keyResults: {
      id: {},
    },
    krCheckIns: {
      createdAt: {},
    },
  },
}));

const tx = {
  query: {
    reviews: {
      findFirst: (...args: unknown[]) => reviewsFindFirst(...args),
    },
    keyResults: {
      findMany: (...args: unknown[]) => keyResultsFindMany(...args),
    },
  },
  update: vi.fn(() => ({
    set: (...args: unknown[]) => updateReviewSet(...args),
  })),
  insert: vi.fn((target: unknown) => {
    if (target === mockedSchema.reviews) {
      return {
        values: (...args: unknown[]) => insertReviewValues(...args),
      };
    }

    return {
      values: (...args: unknown[]) => insertSnapshotValues(...args),
    };
  }),
  delete: vi.fn(() => ({
    where: (...args: unknown[]) => deleteSnapshotWhere(...args),
  })),
};

vi.mock('@/lib/services/task-service', () => ({
  ensureTodayRecurringTasks: (...args: unknown[]) => ensureTodayRecurringTasks(...args),
  listCompletedTasksBetween: (...args: unknown[]) => listCompletedTasksBetween(...args),
  listTaskProgressSnapshotsForKeyResults: (...args: unknown[]) => listTaskProgressSnapshotsForKeyResults(...args),
  listOpenTodayDueTasks: (...args: unknown[]) => listOpenTodayDueTasks(...args),
  listTodayTaskCounts: vi.fn(),
}));

vi.mock('@/lib/services/activity-service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/activity-service')>('@/lib/services/activity-service');
  return {
    ...actual,
    recordActivity: (...args: unknown[]) => recordActivity(...args),
  };
});

vi.mock('@/lib/services/okr-service', () => ({
  getCurrentPeriodSummary: vi.fn(),
  listCheckInsInRange: (...args: unknown[]) => listCheckInsInRange(...args),
  listKeyResultsByIds: (...args: unknown[]) => listKeyResultsByIds(...args),
  listRiskKeyResults: vi.fn(),
}));

vi.mock('@stride-os/db', () => ({
  db: {
    transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
    query: {
      reviews: {
        findFirst: (...args: unknown[]) => reviewsFindFirst(...args),
        findMany: (...args: unknown[]) => reviewsFindMany(...args),
      },
    },
    update: vi.fn(() => ({
      set: (...args: unknown[]) => finalizeUpdateSet(...args),
    })),
  },
  schema: mockedSchema,
}));

import { archiveReview, buildWeeklyReviewDraft, finalizeReview, saveReviewDraft } from '@/lib/services/review-service';

describe('review service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordActivity.mockResolvedValue(undefined);
    ensureTodayRecurringTasks.mockResolvedValue(undefined);
    listCompletedTasksBetween.mockResolvedValue([]);
    listOpenTodayDueTasks.mockResolvedValue([]);
    listTaskProgressSnapshotsForKeyResults.mockResolvedValue([]);
    listCheckInsInRange.mockResolvedValue([]);
    listKeyResultsByIds.mockResolvedValue([]);

    updateReviewSet.mockReturnValue({
      where: (...args: unknown[]) => updateReviewWhere(...args),
    });
    updateReviewWhere.mockReturnValue({
      returning: (...args: unknown[]) => updateReviewReturning(...args),
    });
    insertReviewValues.mockReturnValue({
      returning: (...args: unknown[]) => insertReviewReturning(...args),
    });
    deleteSnapshotWhere.mockResolvedValue(undefined);
    insertSnapshotValues.mockResolvedValue(undefined);

    finalizeUpdateSet.mockReturnValue({
      where: (...args: unknown[]) => finalizeUpdateWhere(...args),
    });
    finalizeUpdateWhere.mockReturnValue({
      returning: (...args: unknown[]) => finalizeUpdateReturning(...args),
    });
  });

  it('ensures today recurring tasks before building weekly draft', async () => {
    const draft = await buildWeeklyReviewDraft('2026-05-05', '2026-05-11');

    expect(ensureTodayRecurringTasks).toHaveBeenCalledTimes(1);
    expect(draft.structuredSummary).toMatchObject({
      completedTaskCount: 0,
      openTodayDueCount: 0,
      keyResultTaskProgress: [],
    });
  });

  it('includes task progress summaries alongside latest check-ins', async () => {
    listCompletedTasksBetween.mockResolvedValue([
      {
        id: 'task_1',
        title: 'Ship review loop',
        keyResultLinks: [{ keyResult: { id: 'kr_1', title: 'Ship review loop' } }],
      },
    ]);
    listTaskProgressSnapshotsForKeyResults.mockResolvedValue([
      {
        keyResultId: 'kr_1',
        committedTaskCount: 3,
        completedCommittedTaskCount: 1,
        openCommittedTaskCount: 2,
        hasCommittedTasks: true,
        lastTaskProgressAt: new Date('2026-05-10T00:00:00.000Z'),
      },
    ]);
    listCheckInsInRange.mockResolvedValue([
      {
        keyResultId: 'kr_1',
        confidence: 'medium',
        summary: 'On track',
        blockers: null,
        nextActions: null,
        createdAt: new Date('2026-05-09T00:00:00.000Z'),
      },
    ]);
    listKeyResultsByIds.mockResolvedValue([
      { id: 'kr_1', title: 'Ship review loop' },
    ]);

    const draft = await buildWeeklyReviewDraft('2026-05-05', '2026-05-11');

    expect(draft.structuredSummary).toMatchObject({
      keyResultTaskProgress: [
        expect.objectContaining({
          keyResultId: 'kr_1',
          committedTaskCount: 3,
          completedCommittedTaskCount: 1,
          openCommittedTaskCount: 2,
        }),
      ],
    });
    expect(draft.body).toContain('任务 1/3');
    expect(draft.body).toContain('On track');
  });

  it('saves a draft and writes KR snapshots', async () => {
    reviewsFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'review_1',
        periodStart: '2026-05-05',
        periodEnd: '2026-05-11',
        title: 'Weekly review',
        body: 'Draft body',
        structuredSummary: { completedTaskCount: 1 },
        krSnapshots: [{ keyResultId: 'kr_1' }],
      });
    insertReviewReturning.mockResolvedValue([
      {
        id: 'review_1',
      },
    ]);
    keyResultsFindMany.mockResolvedValue([
      {
        id: 'kr_1',
        title: 'Ship review loop',
        status: 'active',
        currentValue: 0.5,
        taskProgress: {
          committedTaskCount: 3,
          completedCommittedTaskCount: 1,
          openCommittedTaskCount: 2,
          hasCommittedTasks: true,
          lastTaskProgressAt: new Date('2026-05-10T00:00:00.000Z'),
        },
        latestCheckIn: {
          hasCheckIn: true,
          progressValue: 0.5,
          confidence: 'medium',
          summary: null,
          blockers: null,
          nextActions: null,
          updatedAt: new Date('2026-05-09T00:00:00.000Z'),
        },
        checkIns: [{ confidence: 'medium', createdAt: new Date('2026-05-09T00:00:00.000Z') }],
      },
    ]);

    const result = await saveReviewDraft({
      type: 'weekly',
      periodStart: '2026-05-05',
      periodEnd: '2026-05-11',
      title: 'Weekly review',
      body: 'Draft body',
      structuredSummary: { completedTaskCount: 1 },
      keyResultIds: ['kr_1'],
    }, {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });

    expect(insertSnapshotValues).toHaveBeenCalledWith([
      expect.objectContaining({
        reviewId: 'review_1',
        keyResultId: 'kr_1',
        snapshot: expect.objectContaining({
          title: 'Ship review loop',
          committedTaskCount: 3,
          completedCommittedTaskCount: 1,
          openCommittedTaskCount: 2,
          confidence: 'medium',
        }),
      }),
    ]);
    expect(result?.id).toBe('review_1');
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'review.draft.create',
      targetId: 'review_1',
    }));
  });

  it('finalizes a draft when no conflicting final exists', async () => {
    reviewsFindFirst
      .mockResolvedValueOnce({
        id: 'review_1',
        type: 'weekly',
        periodStart: '2026-05-05',
        periodEnd: '2026-05-11',
        status: 'draft',
      })
      .mockResolvedValueOnce(null);

    finalizeUpdateReturning.mockResolvedValue([
      {
        id: 'review_1',
        status: 'final',
      },
    ]);

    const result = await finalizeReview('review_1', {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });
    expect(result?.status).toBe('final');
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'review.finalize',
    }));
  });

  it('archives a review by setting archivedAt', async () => {
    finalizeUpdateReturning.mockResolvedValue([
      {
        id: 'review_1',
        archivedAt: new Date('2026-05-12T10:00:00.000Z'),
      },
    ]);

    reviewsFindFirst.mockResolvedValueOnce({
      id: 'review_1',
      title: 'Weekly review',
      status: 'final',
    });

    const result = await archiveReview('review_1', {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });
    expect(result?.id).toBe('review_1');
    expect(finalizeUpdateSet).toHaveBeenCalledWith(expect.objectContaining({
      archivedAt: expect.any(Date),
      updatedAt: expect.any(Date),
    }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'review.archive',
    }));
  });

  it('rejects finalizing when another final review already exists for the week', async () => {
    reviewsFindFirst
      .mockResolvedValueOnce({
        id: 'review_1',
        type: 'weekly',
        periodStart: '2026-05-05',
        periodEnd: '2026-05-11',
        status: 'draft',
      })
      .mockResolvedValueOnce({
        id: 'review_final',
        status: 'final',
      });

    await expect(finalizeReview('review_1')).rejects.toThrow(
      'A final review already exists for this period.',
    );
  });

  it('records draft update activity when saving an existing draft', async () => {
    reviewsFindFirst
      .mockResolvedValueOnce({
        id: 'review_1',
        type: 'weekly',
        periodStart: '2026-05-05',
        periodEnd: '2026-05-11',
        status: 'draft',
      })
      .mockResolvedValueOnce({
        id: 'review_1',
        periodStart: '2026-05-05',
        periodEnd: '2026-05-11',
        title: 'Weekly review updated',
        body: 'Draft body updated',
        structuredSummary: { completedTaskCount: 2 },
        krSnapshots: [],
      });
    updateReviewReturning.mockResolvedValue([{
      id: 'review_1',
      title: 'Weekly review updated',
      body: 'Draft body updated',
      structuredSummary: { completedTaskCount: 2 },
    }]);

    await saveReviewDraft({
      type: 'weekly',
      periodStart: '2026-05-05',
      periodEnd: '2026-05-11',
      title: 'Weekly review updated',
      body: 'Draft body updated',
      structuredSummary: { completedTaskCount: 2 },
      keyResultIds: [],
    }, {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });

    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'review.draft.update',
    }));
  });
});
