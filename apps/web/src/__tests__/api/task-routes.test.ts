import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { expectJsonError, jsonRequest } from './helpers';

const listTasksForSource = vi.fn();
const createTask = vi.fn();
const getTaskDetail = vi.fn();
const updateTask = vi.fn();
const completeTask = vi.fn();
const archiveTask = vi.fn();
const archiveTaskDefinition = vi.fn();
const moveTaskToQuadrant = vi.fn();
const replaceTaskKeyResultLinks = vi.fn();
const replaceTaskDefinitionKeyResultLinks = vi.fn();
const ensureTodayRecurringTasks = vi.fn();
const ensureRecurringTasksForDate = vi.fn();
const listQuadrantTasks = vi.fn();
const listTaskDefinitions = vi.fn();
const createTaskDefinition = vi.fn();
const getTaskDefinitionDetail = vi.fn();
const updateTaskDefinition = vi.fn();
const restoreTaskDefinition = vi.fn();

vi.mock('@/lib/auth/api-auth', () => ({
  getAuthUser: vi.fn(async (request: NextRequest) => {
    return request.headers.get('authorization') === 'Bearer ok'
      ? { id: 'user_1', activityContext: { actorType: 'user', actorId: 'user_1', source: 'api' } }
      : null;
  }),
}));

vi.mock('@/lib/services/task-service', () => ({
  QUADRANT_KEYS: ['Q1', 'Q2', 'Q3', 'Q4'],
  TASK_DEFINITION_END_TYPES: ['never', 'until_date', 'after_count'],
  TASK_DEFINITION_FREQUENCIES: ['daily', 'weekly', 'monthly', 'weekdays', 'weekends'],
  TASK_ENERGIES: ['low', 'medium', 'high'],
  TASK_PRIORITIES: ['P1', 'P2', 'P3'],
  archiveTask: (...args: unknown[]) => archiveTask(...args),
  archiveTaskDefinition: (...args: unknown[]) => archiveTaskDefinition(...args),
  completeTask: (...args: unknown[]) => completeTask(...args),
  createTask: (...args: unknown[]) => createTask(...args),
  createTaskDefinition: (...args: unknown[]) => createTaskDefinition(...args),
  ensureRecurringTasksForDate: (...args: unknown[]) => ensureRecurringTasksForDate(...args),
  ensureTodayRecurringTasks: (...args: unknown[]) => ensureTodayRecurringTasks(...args),
  getTaskDefinitionDetail: (...args: unknown[]) => getTaskDefinitionDetail(...args),
  getTaskDetail: (...args: unknown[]) => getTaskDetail(...args),
  listQuadrantTasks: (...args: unknown[]) => listQuadrantTasks(...args),
  listTaskDefinitions: (...args: unknown[]) => listTaskDefinitions(...args),
  listTasksForSource: (...args: unknown[]) => listTasksForSource(...args),
  moveTaskToQuadrant: (...args: unknown[]) => moveTaskToQuadrant(...args),
  replaceTaskDefinitionKeyResultLinks: (...args: unknown[]) => replaceTaskDefinitionKeyResultLinks(...args),
  replaceTaskKeyResultLinks: (...args: unknown[]) => replaceTaskKeyResultLinks(...args),
  restoreTaskDefinition: (...args: unknown[]) => restoreTaskDefinition(...args),
  updateTaskDefinition: (...args: unknown[]) => updateTaskDefinition(...args),
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
import { GET as definitionsGet, POST as definitionsPost } from '@/app/api/v1/tasks/definitions/route';
import { GET as definitionGet, PATCH as definitionPatch } from '@/app/api/v1/tasks/definitions/[id]/route';
import { POST as definitionArchivePost } from '@/app/api/v1/tasks/definitions/[id]/archive/route';
import { POST as definitionRestorePost } from '@/app/api/v1/tasks/definitions/[id]/restore/route';

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

  it('lists and creates task definitions', async () => {
    listTaskDefinitions.mockResolvedValue([{ id: 'def_1' }]);
    createTaskDefinition.mockResolvedValue({ id: 'def_1', title: 'Daily walk' });

    const getResponse = await definitionsGet(new NextRequest('http://localhost/api/v1/tasks/definitions', {
      headers: { authorization: 'Bearer ok' },
    }));
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toEqual([{ id: 'def_1' }]);

    const postResponse = await definitionsPost(jsonRequest('http://localhost/api/v1/tasks/definitions', {
      auth: 'ok',
      body: {
        title: 'Daily walk',
        listId: 'list_1',
        frequency: 'daily',
        endType: 'never',
        keyResultLinks: [{ keyResultId: 'kr_1', countsTowardCommitment: true }],
        targetDate: '2026-05-17',
      },
    }));

    expect(postResponse.status).toBe(201);
    expect(createTaskDefinition).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Daily walk',
      listId: 'list_1',
      frequency: 'daily',
      endType: 'never',
    }));
    expect(replaceTaskDefinitionKeyResultLinks).toHaveBeenCalledWith('def_1', [{ keyResultId: 'kr_1', countsTowardCommitment: true }]);
    expect(ensureRecurringTasksForDate).toHaveBeenCalledWith('2026-05-17');
  });

  it('gets, patches, archives, and restores task definitions', async () => {
    getTaskDefinitionDetail.mockResolvedValue({ id: 'def_1', title: 'Old def' });
    updateTaskDefinition.mockResolvedValue({ id: 'def_1', title: 'New def' });
    archiveTaskDefinition.mockResolvedValue({ id: 'def_1', archived: true });
    restoreTaskDefinition.mockResolvedValue({ id: 'def_1', archived: false });

    const getResponse = await definitionGet(new NextRequest('http://localhost/api/v1/tasks/definitions/def_1', {
      headers: { authorization: 'Bearer ok' },
    }), { params: Promise.resolve({ id: 'def_1' }) });
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toEqual({ id: 'def_1', title: 'Old def' });

    const patchResponse = await definitionPatch(jsonRequest('http://localhost/api/v1/tasks/definitions/def_1', {
      auth: 'ok',
      method: 'PATCH',
      body: {
        title: 'New def',
        keyResultLinks: [{ keyResultId: 'kr_2', countsTowardCommitment: false }],
      },
    }), { params: Promise.resolve({ id: 'def_1' }) });
    expect(patchResponse.status).toBe(200);
    expect(updateTaskDefinition).toHaveBeenCalledWith('def_1', expect.objectContaining({ title: 'New def' }));
    expect(replaceTaskDefinitionKeyResultLinks).toHaveBeenCalledWith('def_1', [{ keyResultId: 'kr_2', countsTowardCommitment: false }]);

    expect((await definitionArchivePost(jsonRequest('http://localhost/api/v1/tasks/definitions/def_1/archive', {
      auth: 'ok',
    }), { params: Promise.resolve({ id: 'def_1' }) })).status).toBe(200);
    expect((await definitionRestorePost(jsonRequest('http://localhost/api/v1/tasks/definitions/def_1/restore', {
      auth: 'ok',
    }), { params: Promise.resolve({ id: 'def_1' }) })).status).toBe(200);
  });
});
