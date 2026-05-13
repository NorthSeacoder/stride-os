import { beforeEach, describe, expect, it, vi } from 'vitest';

const ensureTodayRecurringTasks = vi.fn();
const listCompletedTasksBetween = vi.fn();
const listOpenTodayDueTasks = vi.fn();
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
  listOpenTodayDueTasks: (...args: unknown[]) => listOpenTodayDueTasks(...args),
  listTodayTaskCounts: vi.fn(),
}));

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
    ensureTodayRecurringTasks.mockResolvedValue(undefined);
    listCompletedTasksBetween.mockResolvedValue([]);
    listOpenTodayDueTasks.mockResolvedValue([]);
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
    });
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
    });

    expect(insertSnapshotValues).toHaveBeenCalledWith([
      expect.objectContaining({
        reviewId: 'review_1',
        keyResultId: 'kr_1',
        snapshot: expect.objectContaining({
          title: 'Ship review loop',
          confidence: 'medium',
        }),
      }),
    ]);
    expect(result?.id).toBe('review_1');
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

    const result = await finalizeReview('review_1');
    expect(result?.status).toBe('final');
  });

  it('archives a review by setting archivedAt', async () => {
    finalizeUpdateReturning.mockResolvedValue([
      {
        id: 'review_1',
        archivedAt: new Date('2026-05-12T10:00:00.000Z'),
      },
    ]);

    const result = await archiveReview('review_1');
    expect(result?.id).toBe('review_1');
    expect(finalizeUpdateSet).toHaveBeenCalledWith(expect.objectContaining({
      archivedAt: expect.any(Date),
      updatedAt: expect.any(Date),
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
});
