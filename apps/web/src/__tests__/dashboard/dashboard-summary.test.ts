import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCurrentPeriodSummary = vi.fn();
const ensureTodayRecurringTasks = vi.fn();
const listTodayTaskCounts = vi.fn();
const listTaskDashboardCounts = vi.fn();
const listRiskKeyResults = vi.fn();
const getLatestReview = vi.fn();

vi.mock('@/lib/services/okr-service', () => ({
  getCurrentPeriodSummary: (...args: unknown[]) => getCurrentPeriodSummary(...args),
  listCheckInsInRange: vi.fn(),
  listKeyResultsByIds: vi.fn(),
  listRiskKeyResults: (...args: unknown[]) => listRiskKeyResults(...args),
}));

vi.mock('@/lib/services/task-service', () => ({
  ensureTodayRecurringTasks: (...args: unknown[]) => ensureTodayRecurringTasks(...args),
  listCompletedTasksBetween: vi.fn(),
  listOpenTodayDueTasks: vi.fn(),
  listTaskDashboardCounts: (...args: unknown[]) => listTaskDashboardCounts(...args),
  listTodayTaskCounts: (...args: unknown[]) => listTodayTaskCounts(...args),
}));

vi.mock('@stride-os/db', () => ({
  db: {
    query: {
      reviews: {
        findFirst: (...args: unknown[]) => getLatestReview(...args),
        findMany: vi.fn(),
      },
    },
  },
  schema: {
    reviews: {
      periodStart: {},
      createdAt: {},
      id: {},
      status: {},
      type: {},
      periodEnd: {},
      updatedAt: {},
    },
    reviewKrSnapshots: {
      reviewId: {},
    },
    keyResults: {
      id: {},
    },
    krCheckIns: {
      createdAt: {},
    },
  },
}));

import { getDashboardSummary } from '@/lib/services/review-service';

describe('dashboard summary aggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureTodayRecurringTasks.mockResolvedValue(undefined);
  });

  it('returns empty-safe summary when no data exists', async () => {
    getCurrentPeriodSummary.mockResolvedValue(null);
    listTodayTaskCounts.mockResolvedValue({ mustCount: 0, focusCount: 0 });
    listTaskDashboardCounts.mockResolvedValue({ inboxCount: 0, dueTodayCount: 0, dueTomorrowCount: 0, overdueCount: 0, completedCount: 0 });
    listRiskKeyResults.mockResolvedValue([]);
    getLatestReview.mockResolvedValue(null);

    const summary = await getDashboardSummary();

    expect(ensureTodayRecurringTasks).toHaveBeenCalledTimes(1);
    expect(summary.currentPeriodSummary).toBeNull();
    expect(summary.todayTaskCounts).toEqual({ mustCount: 0, focusCount: 0 });
    expect(summary.chartStats.taskDashboardCounts).toEqual({ inboxCount: 0, dueTodayCount: 0, dueTomorrowCount: 0, overdueCount: 0, completedCount: 0 });
    expect(summary.riskKeyResults).toEqual([]);
    expect(summary.latestReview).toBeNull();
  });

  it('passes through risk KR and latest review data', async () => {
    getCurrentPeriodSummary.mockResolvedValue({
      period: { name: '2026 Q2' },
      objectiveCount: 2,
      keyResultCount: 5,
      activeKeyResultCount: 4,
    });
    listTodayTaskCounts.mockResolvedValue({ mustCount: 2, focusCount: 1 });
    listTaskDashboardCounts.mockResolvedValue({ inboxCount: 3, dueTodayCount: 3, dueTomorrowCount: 2, overdueCount: 1, completedCount: 8 });
    listRiskKeyResults.mockResolvedValue([
      { id: 'kr_1', title: 'Recover confidence', status: 'at_risk' },
    ]);
    getLatestReview.mockResolvedValue({
      id: 'review_1',
      title: 'Week 19 review',
      status: 'draft',
    });

    const summary = await getDashboardSummary();

    expect(ensureTodayRecurringTasks).toHaveBeenCalledTimes(1);
    expect(summary.currentPeriodSummary?.period.name).toBe('2026 Q2');
    expect(summary.chartStats.taskDashboardCounts.completedCount).toBe(8);
    expect(summary.riskKeyResults).toHaveLength(1);
    expect(summary.latestReview?.title).toBe('Week 19 review');
  });
});
