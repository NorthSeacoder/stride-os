import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { expectJsonError, jsonRequest } from './helpers';

const listTasksForSource = vi.fn();
const createTask = vi.fn();
const getTaskDetail = vi.fn();
const updateTask = vi.fn();
const completeTask = vi.fn();
const archiveTask = vi.fn();
const moveTaskToQuadrant = vi.fn();
const replaceTaskKeyResultLinks = vi.fn();
const ensureTodayRecurringTasks = vi.fn();
const listQuadrantTasks = vi.fn();

vi.mock('@/lib/auth/api-auth', () => ({
  getAuthUser: vi.fn(async (request: NextRequest) => {
    return request.headers.get('authorization') === 'Bearer ok'
      ? { id: 'user_1', activityContext: { actorType: 'user', actorId: 'user_1', source: 'api' } }
      : null;
  }),
}));

vi.mock('@/lib/services/task-service', () => ({
  QUADRANT_KEYS: ['Q1', 'Q2', 'Q3', 'Q4'],
  TASK_ENERGIES: ['low', 'medium', 'high'],
  TASK_PRIORITIES: ['P1', 'P2', 'P3'],
  archiveTask: (...args: unknown[]) => archiveTask(...args),
  completeTask: (...args: unknown[]) => completeTask(...args),
  createTask: (...args: unknown[]) => createTask(...args),
  ensureTodayRecurringTasks: (...args: unknown[]) => ensureTodayRecurringTasks(...args),
  getTaskDetail: (...args: unknown[]) => getTaskDetail(...args),
  listQuadrantTasks: (...args: unknown[]) => listQuadrantTasks(...args),
  listTasksForSource: (...args: unknown[]) => listTasksForSource(...args),
  moveTaskToQuadrant: (...args: unknown[]) => moveTaskToQuadrant(...args),
  replaceTaskKeyResultLinks: (...args: unknown[]) => replaceTaskKeyResultLinks(...args),
  updateTask: (...args: unknown[]) => updateTask(...args),
}));

import { GET as tasksGet, POST as tasksPost } from '@/app/api/v1/tasks/route';
import { GET as taskGet, PATCH as taskPatch } from '@/app/api/v1/tasks/[id]/route';
import { POST as completePost } from '@/app/api/v1/tasks/[id]/complete/route';
import { POST as restorePost } from '@/app/api/v1/tasks/[id]/restore/route';
import { POST as archivePost } from '@/app/api/v1/tasks/[id]/archive/route';
import { POST as quadrantPost } from '@/app/api/v1/tasks/[id]/quadrant/route';
import { GET as remindersGet } from '@/app/api/v1/tasks/reminders/route';
import { GET as todayGet } from '@/app/api/v1/tasks/today/route';
import { GET as inboxGet } from '@/app/api/v1/tasks/inbox/route';
import { GET as quadrantsGet } from '@/app/api/v1/tasks/quadrants/route';

describe('task api routes', () => {
  it('returns 401 for unauthorized task list request', async () => {
    const response = await tasksGet(new NextRequest('http://localhost/api/v1/tasks'));
    await expectJsonError(response, 401, 'Unauthorized');
  });

  it('lists tasks from a selected source', async () => {
    listTasksForSource.mockResolvedValue([{ items: [{ id: 'task_1' }] }, { items: [{ id: 'task_2' }] }]);

    const response = await tasksGet(new NextRequest('http://localhost/api/v1/tasks?source=today', {
      headers: { authorization: 'Bearer ok' },
    }));

    expect(response.status).toBe(200);
    expect(listTasksForSource).toHaveBeenCalledWith('today');
    expect(await response.json()).toEqual([{ id: 'task_1' }, { id: 'task_2' }]);
  });

  it('creates a task and replaces key result links', async () => {
    createTask.mockResolvedValue({ id: 'task_1', title: 'Write review' });

    const response = await tasksPost(jsonRequest('http://localhost/api/v1/tasks', {
      auth: 'ok',
      body: { title: 'Write review', priority: 'P1', keyResultIds: ['kr_1'] },
    }));

    expect(response.status).toBe(201);
    expect(createTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Write review', priority: 'P1' }), expect.objectContaining({
      activityContext: expect.objectContaining({
        actorId: 'user_1',
        source: 'api',
      }),
    }));
    expect(replaceTaskKeyResultLinks).toHaveBeenCalledWith('task_1', ['kr_1'], expect.objectContaining({
      activityContext: expect.objectContaining({
        actorId: 'user_1',
        source: 'api',
      }),
    }));
  });

  it('returns 400 for blank task title', async () => {
    const response = await tasksPost(jsonRequest('http://localhost/api/v1/tasks', {
      auth: 'ok',
      body: { title: '   ' },
    }));

    await expectJsonError(response, 400, 'Title is required');
  });

  it('gets and patches a task', async () => {
    getTaskDetail.mockResolvedValue({ id: 'task_1', title: 'Old' });
    updateTask.mockResolvedValue({ id: 'task_1', title: 'New' });

    const getResponse = await taskGet(new NextRequest('http://localhost/api/v1/tasks/task_1', {
      headers: { authorization: 'Bearer ok' },
    }), { params: Promise.resolve({ id: 'task_1' }) });
    expect(await getResponse.json()).toEqual({ id: 'task_1', title: 'Old' });

    const patchResponse = await taskPatch(jsonRequest('http://localhost/api/v1/tasks/task_1', {
      auth: 'ok',
      method: 'PATCH',
      body: { title: 'New', keyResultIds: ['kr_2'] },
    }), { params: Promise.resolve({ id: 'task_1' }) });

    expect(patchResponse.status).toBe(200);
    expect(updateTask).toHaveBeenCalledWith('task_1', expect.objectContaining({ title: 'New' }), expect.objectContaining({
      activityContext: expect.objectContaining({
        actorId: 'user_1',
        source: 'api',
      }),
    }));
    expect(replaceTaskKeyResultLinks).toHaveBeenCalledWith('task_1', ['kr_2'], expect.objectContaining({
      activityContext: expect.objectContaining({
        actorId: 'user_1',
        source: 'api',
      }),
    }));
  });

  it('completes, restores, archives, and moves task quadrant', async () => {
    completeTask.mockResolvedValue({ id: 'task_1', status: 'done' });
    updateTask.mockResolvedValue({ id: 'task_1', status: 'inbox' });
    archiveTask.mockResolvedValue({ id: 'task_1', archivedAt: '2026-05-13T00:00:00.000Z' });
    moveTaskToQuadrant.mockResolvedValue({ id: 'task_1', priority: 'P2' });

    expect((await completePost(jsonRequest('http://localhost/api/v1/tasks/task_1/complete', { auth: 'ok' }), { params: Promise.resolve({ id: 'task_1' }) })).status).toBe(200);
    expect((await restorePost(jsonRequest('http://localhost/api/v1/tasks/task_1/restore', { auth: 'ok' }), { params: Promise.resolve({ id: 'task_1' }) })).status).toBe(200);
    expect((await archivePost(jsonRequest('http://localhost/api/v1/tasks/task_1/archive', { auth: 'ok' }), { params: Promise.resolve({ id: 'task_1' }) })).status).toBe(200);
    expect((await quadrantPost(jsonRequest('http://localhost/api/v1/tasks/task_1/quadrant', { auth: 'ok', body: { quadrant: 'Q2' } }), { params: Promise.resolve({ id: 'task_1' }) })).status).toBe(200);
  });

  it('returns 400 for invalid quadrant', async () => {
    const response = await quadrantPost(jsonRequest('http://localhost/api/v1/tasks/task_1/quadrant', {
      auth: 'ok',
      body: { quadrant: 'Q9' },
    }), { params: Promise.resolve({ id: 'task_1' }) });

    await expectJsonError(response, 400, 'quadrant is invalid');
  });

  it('returns stateless reminder candidates', async () => {
    listTasksForSource.mockResolvedValue([{
      items: [
        { id: 'overdue', dueDate: '2026-05-01', status: 'inbox', completedAt: null },
        { id: 'done', dueDate: '2026-05-01', status: 'done', completedAt: '2026-05-01T00:00:00.000Z' },
        { id: 'future', dueDate: '2026-06-01', status: 'inbox', completedAt: null },
      ],
    }]);

    const response = await remindersGet(new NextRequest('http://localhost/api/v1/tasks/reminders?today=2026-05-13&to=2026-05-20', {
      headers: { authorization: 'Bearer ok' },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ items: [{ id: 'overdue' }] });
  });

  it('keeps existing today, inbox, and quadrants routes working', async () => {
    listTasksForSource.mockResolvedValue([{ items: [{ id: 'task_1' }] }]);
    listQuadrantTasks.mockResolvedValue([{ id: 'task_q1' }]);

    expect((await todayGet(new NextRequest('http://localhost/api/v1/tasks/today', { headers: { authorization: 'Bearer ok' } }))).status).toBe(200);
    expect((await inboxGet(new NextRequest('http://localhost/api/v1/tasks/inbox', { headers: { authorization: 'Bearer ok' } }))).status).toBe(200);
    expect((await quadrantsGet(new NextRequest('http://localhost/api/v1/tasks/quadrants', { headers: { authorization: 'Bearer ok' } }))).status).toBe(200);
  });
});
