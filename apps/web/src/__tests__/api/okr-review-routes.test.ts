import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/api-auth', () => ({
  getAuthUser: vi.fn(async (request: NextRequest) => {
    if (request.headers.get('authorization') === 'Bearer ok') return { id: 'user_1' };
    if (request.headers.get('x-session-test') === '1') return { id: 'user_cookie' };
    return null;
  }),
}));

vi.mock('@/lib/services/okr-service', () => ({
  createKrCheckIn: vi.fn(async (input: Record<string, unknown>) => ({ id: 'checkin_1', ...input })),
  getCurrentPeriodSummary: vi.fn(async () => ({ period: { id: 'period_1', name: '2026 Q2' }, objectiveCount: 1, keyResultCount: 2, activeKeyResultCount: 2 })),
}));

vi.mock('@/lib/services/review-service', () => ({
  archiveReview: vi.fn(async () => ({ id: 'review_1', archivedAt: new Date() })),
  buildWeeklyReviewDraft: vi.fn(async (periodStart: string, periodEnd: string) => ({
    type: 'weekly',
    periodStart,
    periodEnd,
    title: 'Weekly review',
    body: 'Draft',
    structuredSummary: {},
    keyResultIds: [],
  })),
  finalizeReview: vi.fn(async () => ({ id: 'review_1', status: 'final' })),
  getReview: vi.fn(async () => ({ id: 'review_1', type: 'weekly', periodStart: '2026-05-05', periodEnd: '2026-05-11', status: 'draft' })),
  listReviews: vi.fn(async () => []),
  saveReviewDraft: vi.fn(async () => ({ id: 'review_1', periodStart: '2026-05-05', periodEnd: '2026-05-11', title: 'Weekly review', body: 'Draft', structuredSummary: {}, krSnapshots: [] })),
  updateReviewDraftById: vi.fn(async () => ({ id: 'review_1', status: 'draft' })),
}));

vi.mock('@stride-os/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(async () => undefined),
    })),
  },
  schema: {
    auditLogs: {},
  },
}));

import { GET as currentOkrGet } from '@/app/api/v1/okr/current/route';
import { POST as checkInPost } from '@/app/api/v1/key-results/[id]/check-ins/route';
import { POST as weeklyDraftPost } from '@/app/api/v1/reviews/weekly/draft/route';
import { POST as reviewsPost } from '@/app/api/v1/reviews/route';

describe('okr/review api routes', () => {
  it('returns 401 for unauthorized current okr request', async () => {
    const response = await currentOkrGet(new NextRequest('http://localhost/api/v1/okr/current'));
    expect(response.status).toBe(401);
  });

  it('allows cookie/session style auth on current okr route', async () => {
    const response = await currentOkrGet(new NextRequest('http://localhost/api/v1/okr/current', {
      headers: { 'x-session-test': '1' },
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({
      period: expect.objectContaining({ name: '2026 Q2' }),
    }));
  });

  it('returns 400 when check-in confidence is missing', async () => {
    const request = new NextRequest('http://localhost/api/v1/key-results/kr_1/check-ins', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ok' },
      body: JSON.stringify({ summary: 'No confidence' }),
    });

    const response = await checkInPost(request, {
      params: Promise.resolve({ id: 'kr_1' }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Confidence is required' });
  });

  it('returns 400 when weekly draft dates are missing', async () => {
    const request = new NextRequest('http://localhost/api/v1/reviews/weekly/draft', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ok' },
      body: JSON.stringify({}),
    });

    const response = await weeklyDraftPost(request);
    expect(response.status).toBe(400);
  });

  it('saves review draft through bearer auth path', async () => {
    const request = new NextRequest('http://localhost/api/v1/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ok' },
      body: JSON.stringify({
        type: 'weekly',
        periodStart: '2026-05-05',
        periodEnd: '2026-05-11',
        title: 'Week 19 review',
        body: 'Draft body',
        structuredSummary: {},
        keyResultIds: [],
      }),
    });

    const response = await reviewsPost(request);
    expect(response.status).toBe(201);
  });
});
