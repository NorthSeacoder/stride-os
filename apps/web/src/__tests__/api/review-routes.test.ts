import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { expectJsonError, jsonRequest } from './helpers';

const getReview = vi.fn();
const updateReviewDraftById = vi.fn();
const finalizeReview = vi.fn();
const archiveReview = vi.fn();
const listReviews = vi.fn();
const listTasksForReviewPeriod = vi.fn();
const getCurrentPeriodSummary = vi.fn();
const listCheckInsInRange = vi.fn();

vi.mock('@/lib/auth/api-auth', () => ({
  getAuthUser: vi.fn(async (request: NextRequest) => {
    return request.headers.get('authorization') === 'Bearer ok'
      ? { id: 'user_1', activityContext: { actorType: 'user', actorId: 'user_1', source: 'api' } }
      : null;
  }),
}));

vi.mock('@/lib/services/review-service', () => ({
  archiveReview: (...args: unknown[]) => archiveReview(...args),
  finalizeReview: (...args: unknown[]) => finalizeReview(...args),
  getReview: (...args: unknown[]) => getReview(...args),
  listReviews: (...args: unknown[]) => listReviews(...args),
  updateReviewDraftById: (...args: unknown[]) => updateReviewDraftById(...args),
}));

vi.mock('@/lib/services/task-service', () => ({
  listTasksForReviewPeriod: (...args: unknown[]) => listTasksForReviewPeriod(...args),
}));

vi.mock('@/lib/services/okr-service', () => ({
  getCurrentPeriodSummary: (...args: unknown[]) => getCurrentPeriodSummary(...args),
  listCheckInsInRange: (...args: unknown[]) => listCheckInsInRange(...args),
}));

import { GET as reviewGet, PATCH as reviewPatch } from '@/app/api/v1/reviews/[id]/route';
import { POST as finalizePost } from '@/app/api/v1/reviews/[id]/finalize/route';
import { POST as archivePost } from '@/app/api/v1/reviews/[id]/archive/route';
import { GET as contextGet } from '@/app/api/v1/reviews/context/route';

describe('review api routes', () => {
  it('returns 401 for unauthorized review detail request', async () => {
    const response = await reviewGet(new NextRequest('http://localhost/api/v1/reviews/review_1'), {
      params: Promise.resolve({ id: 'review_1' }),
    });

    await expectJsonError(response, 401, 'Unauthorized');
  });

  it('gets a review detail and returns 404 when missing', async () => {
    getReview.mockResolvedValueOnce({ id: 'review_1', title: 'Week review' });
    const response = await reviewGet(jsonRequest('http://localhost/api/v1/reviews/review_1', { auth: 'ok' }), {
      params: Promise.resolve({ id: 'review_1' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: 'review_1', title: 'Week review' });

    getReview.mockResolvedValueOnce(null);
    const missing = await reviewGet(jsonRequest('http://localhost/api/v1/reviews/missing', { auth: 'ok' }), {
      params: Promise.resolve({ id: 'missing' }),
    });

    await expectJsonError(missing, 404, 'Not found');
  });

  it('keeps PATCH update and status final compatibility', async () => {
    getReview
      .mockResolvedValueOnce({ id: 'review_1', status: 'draft' })
      .mockResolvedValueOnce({ id: 'review_1', title: 'New title' })
      .mockResolvedValueOnce({ id: 'review_1', status: 'draft' })
      .mockResolvedValueOnce({ id: 'review_1', status: 'final' });
    updateReviewDraftById.mockResolvedValue({ id: 'review_1', title: 'New title' });
    finalizeReview.mockResolvedValue({ id: 'review_1', status: 'final' });

    const patchResponse = await reviewPatch(jsonRequest('http://localhost/api/v1/reviews/review_1', {
      auth: 'ok',
      method: 'PATCH',
      body: { title: 'New title' },
    }), { params: Promise.resolve({ id: 'review_1' }) });

    expect(patchResponse.status).toBe(200);
    expect(updateReviewDraftById).toHaveBeenCalledWith('review_1', { title: 'New title' }, expect.objectContaining({
      activityContext: expect.objectContaining({
        actorId: 'user_1',
        source: 'api',
      }),
    }));

    const finalResponse = await reviewPatch(jsonRequest('http://localhost/api/v1/reviews/review_1', {
      auth: 'ok',
      method: 'PATCH',
      body: { status: 'final' },
    }), { params: Promise.resolve({ id: 'review_1' }) });

    expect(finalResponse.status).toBe(200);
    expect(finalizeReview).toHaveBeenCalledWith('review_1', expect.objectContaining({
      activityContext: expect.objectContaining({
        actorId: 'user_1',
        source: 'api',
      }),
    }));
  });

  it('finalizes and archives reviews through explicit action routes', async () => {
    finalizeReview.mockResolvedValue({ id: 'review_1', status: 'final' });
    getReview.mockResolvedValue({ id: 'review_1', status: 'final' });
    archiveReview.mockResolvedValue({ id: 'review_1', archivedAt: '2026-05-13T00:00:00.000Z' });

    const finalResponse = await finalizePost(jsonRequest('http://localhost/api/v1/reviews/review_1/finalize', { auth: 'ok' }), {
      params: Promise.resolve({ id: 'review_1' }),
    });
    expect(finalResponse.status).toBe(200);

    const archiveResponse = await archivePost(jsonRequest('http://localhost/api/v1/reviews/review_1/archive', { auth: 'ok' }), {
      params: Promise.resolve({ id: 'review_1' }),
    });
    expect(archiveResponse.status).toBe(200);
  });

  it('returns conflict when final review already exists', async () => {
    finalizeReview.mockRejectedValue(new Error('A final review already exists for this period.'));

    const response = await finalizePost(jsonRequest('http://localhost/api/v1/reviews/review_1/finalize', { auth: 'ok' }), {
      params: Promise.resolve({ id: 'review_1' }),
    });

    await expectJsonError(response, 409, 'A final review already exists for this period.');
  });

  it('returns daily context by default and period context with explicit range', async () => {
    listTasksForReviewPeriod.mockResolvedValue({ completedTasks: [{ id: 'task_1' }], openTodayDueTasks: [] });
    getCurrentPeriodSummary.mockResolvedValue({ period: { id: 'period_1' } });
    listCheckInsInRange.mockResolvedValue([{ id: 'checkin_1' }]);
    listReviews.mockResolvedValue([
      { id: 'review_1', type: 'weekly', periodStart: '2026-05-04', periodEnd: '2026-05-10' },
      { id: 'review_2', type: 'monthly', periodStart: '2026-05-01', periodEnd: '2026-05-31' },
    ]);

    const dailyResponse = await contextGet(jsonRequest('http://localhost/api/v1/reviews/context', { auth: 'ok' }));
    expect(dailyResponse.status).toBe(200);
    expect(await dailyResponse.json()).toEqual(expect.objectContaining({
      type: 'daily',
      tasks: { completedTasks: [{ id: 'task_1' }], openTodayDueTasks: [] },
      okr: expect.objectContaining({ checkIns: [{ id: 'checkin_1' }] }),
    }));

    const periodResponse = await contextGet(jsonRequest('http://localhost/api/v1/reviews/context?type=monthly&start=2026-05-01&end=2026-05-31', { auth: 'ok' }));
    expect(periodResponse.status).toBe(200);
    expect(await periodResponse.json()).toEqual(expect.objectContaining({
      type: 'monthly',
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      reviews: [{ id: 'review_2', type: 'monthly', periodStart: '2026-05-01', periodEnd: '2026-05-31' }],
    }));
  });

  it('validates review context type and dates', async () => {
    await expectJsonError(
      await contextGet(jsonRequest('http://localhost/api/v1/reviews/context?type=yearly', { auth: 'ok' })),
      400,
      'type is invalid',
    );

    await expectJsonError(
      await contextGet(jsonRequest('http://localhost/api/v1/reviews/context?type=weekly&start=2026-05-13', { auth: 'ok' })),
      400,
      'start and end are required',
    );

    await expectJsonError(
      await contextGet(jsonRequest('http://localhost/api/v1/reviews/context?type=weekly&start=2026-05-14&end=2026-05-13', { auth: 'ok' })),
      400,
      'end must be on or after start',
    );
  });
});
