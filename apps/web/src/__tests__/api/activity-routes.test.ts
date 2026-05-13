import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { expectJsonError, jsonRequest } from './helpers';

const listActivity = vi.fn();

vi.mock('@/lib/auth/api-auth', () => ({
  getAuthUser: vi.fn(async (request: NextRequest) => {
    return request.headers.get('authorization') === 'Bearer ok'
      ? { id: 'user_1', activityContext: { actorType: 'user', actorId: 'user_1', source: 'api' } }
      : null;
  }),
}));

vi.mock('@/lib/services/activity-service', () => ({
  listActivity: (...args: unknown[]) => listActivity(...args),
}));

import { GET as activityGet } from '@/app/api/v1/activity/route';

describe('activity api routes', () => {
  it('returns 401 for unauthorized activity requests', async () => {
    const response = await activityGet(new NextRequest('http://localhost/api/v1/activity'));
    await expectJsonError(response, 401, 'Unauthorized');
  });

  it('lists recent activity with filters and pagination params', async () => {
    listActivity.mockResolvedValue({
      items: [{ id: 'log_1', action: 'task.update' }],
      nextCursor: 'next_1',
    });

    const response = await activityGet(new NextRequest(
      'http://localhost/api/v1/activity?targetType=task&targetId=task_1&actorType=user&actorId=user_1&source=api&action=task.update&keyword=review&changedField=title&cursor=cur_1&limit=10&start=2026-05-01T00:00:00.000Z&end=2026-05-31T23:59:59.000Z',
      { headers: { authorization: 'Bearer ok' } },
    ));

    expect(response.status).toBe(200);
    expect(listActivity).toHaveBeenCalledWith(expect.objectContaining({
      targetType: 'task',
      targetId: 'task_1',
      actorType: 'user',
      actorId: 'user_1',
      source: 'api',
      action: 'task.update',
      keyword: 'review',
      changedField: 'title',
      cursor: 'cur_1',
      limit: 10,
      start: new Date('2026-05-01T00:00:00.000Z'),
      end: new Date('2026-05-31T23:59:59.000Z'),
    }));
    expect(await response.json()).toEqual({
      items: [{ id: 'log_1', action: 'task.update' }],
      nextCursor: 'next_1',
    });
  });

  it('returns 400 for invalid cursor limits and date params', async () => {
    await expectJsonError(
      await activityGet(jsonRequest('http://localhost/api/v1/activity?limit=0', { auth: 'ok' })),
      400,
      'limit is invalid',
    );

    await expectJsonError(
      await activityGet(jsonRequest('http://localhost/api/v1/activity?start=nope', { auth: 'ok' })),
      400,
      'start is invalid',
    );

    await expectJsonError(
      await activityGet(jsonRequest('http://localhost/api/v1/activity?end=nope', { auth: 'ok' })),
      400,
      'end is invalid',
    );
  });

  it('returns empty activity result sets', async () => {
    listActivity.mockResolvedValue({
      items: [],
      nextCursor: null,
    });

    const response = await activityGet(jsonRequest('http://localhost/api/v1/activity', { auth: 'ok' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [],
      nextCursor: null,
    });
  });
});
