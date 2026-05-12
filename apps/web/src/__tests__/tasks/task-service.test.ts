import { beforeEach, describe, expect, it, vi } from 'vitest';

const txDeleteWhere = vi.fn();
const txDelete = vi.fn(() => ({ where: txDeleteWhere }));
const txInsertValues = vi.fn();
const txInsert = vi.fn(() => ({ values: txInsertValues }));
const txUpdateSet = vi.fn();
const txUpdate = vi.fn(() => ({ set: txUpdateSet }));
const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({
  delete: txDelete,
  insert: txInsert,
  update: txUpdate,
}));
const findManyTaskKrLinks = vi.fn();
const findManyTaskDefinitionKrLinks = vi.fn();
const findManyTasks = vi.fn();
const findManyTaskLists = vi.fn();
const findFirstTask = vi.fn();
const findManyTaskDefinitions = vi.fn();
const findFirstTaskDefinition = vi.fn();
const insertValues = vi.fn();
const updateSet = vi.fn();
const updateWhere = vi.fn();
const updateReturning = vi.fn();

vi.mock('@stride-os/db', () => ({
  db: {
    transaction: (callback: (tx: unknown) => Promise<unknown>) => transaction(callback),
    insert: vi.fn(() => ({
      values: (...args: unknown[]) => insertValues(...args),
    })),
    update: vi.fn(() => ({
      set: (...args: unknown[]) => updateSet(...args),
    })),
    query: {
      taskKrLinks: {
        findMany: (...args: unknown[]) => findManyTaskKrLinks(...args),
      },
      taskDefinitionKrLinks: {
        findMany: (...args: unknown[]) => findManyTaskDefinitionKrLinks(...args),
      },
      taskLists: {
        findMany: (...args: unknown[]) => findManyTaskLists(...args),
      },
      taskDefinitions: {
        findMany: (...args: unknown[]) => findManyTaskDefinitions(...args),
        findFirst: (...args: unknown[]) => findFirstTaskDefinition(...args),
      },
      tasks: {
        findMany: (...args: unknown[]) => findManyTasks(...args),
        findFirst: (...args: unknown[]) => findFirstTask(...args),
      },
    },
  },
  schema: {
    taskKrLinks: {
      taskId: {},
      keyResultId: {},
      createdAt: {},
    },
    taskDefinitionKrLinks: {
      definitionId: {},
      keyResultId: {},
    },
    taskLists: {
      archivedAt: {},
      sortOrder: {},
      createdAt: {},
      slug: {},
    },
    taskDefinitions: {
      id: {},
    },
    tasks: {
      id: {},
      status: {},
      dueDate: {},
      createdAt: {},
      definitionId: {},
      occurrenceDate: {},
    },
  },
}));

import {
  buildTaskUpdatePatch,
  createTaskDefinition,
  getTaskDetail,
  ensureRecurringTasksForDate,
  listTaskDashboardCounts,
  listTaskListsWithCounts,
  listTaskSources,
  listTasksForSource,
  replaceTaskDefinitionKeyResultLinks,
  replaceTaskKeyResultLinks,
  updateTaskDefinition,
} from '@/lib/services/task-service';

describe('task service rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txDelete.mockReturnValue({ where: txDeleteWhere });
    txInsert.mockReturnValue({ values: txInsertValues });
    txUpdate.mockReturnValue({ set: txUpdateSet });
    transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
      delete: txDelete,
      insert: txInsert,
      update: txUpdate,
    }));
    updateSet.mockReturnValue({ where: updateWhere });
    updateWhere.mockReturnValue({ returning: updateReturning });
  });

  it('builds a simple task update patch under the new task model', () => {
    const patch = buildTaskUpdatePatch({
      title: 'Refine workspace',
      dueDate: '2026-05-12',
      completedAt: null,
    });

    expect(patch.title).toBe('Refine workspace');
    expect(patch.dueDate).toBe('2026-05-12');
    expect(patch.completedAt).toBeNull();
  });

  it('replaces task key result links and reads linked records outside the transaction', async () => {
    findManyTaskKrLinks.mockResolvedValue([
      { taskId: 'task_1', keyResultId: 'kr_1' },
      { taskId: 'task_1', keyResultId: 'kr_2' },
    ]);

    await expect(replaceTaskKeyResultLinks('task_1', ['kr_1', 'kr_1', 'kr_2'])).resolves.toHaveLength(2);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(txDelete).toHaveBeenCalled();
    expect(txInsertValues).toHaveBeenCalledWith([
      { taskId: 'task_1', keyResultId: 'kr_1' },
      { taskId: 'task_1', keyResultId: 'kr_2' },
    ]);
    expect(findManyTaskKrLinks).toHaveBeenCalledTimes(1);
  });

  it('clears task key result links without querying when no key results are selected', async () => {
    await expect(replaceTaskKeyResultLinks('task_1', [])).resolves.toEqual([]);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(txDelete).toHaveBeenCalled();
    expect(txInsert).not.toHaveBeenCalled();
    expect(findManyTaskKrLinks).not.toHaveBeenCalled();
  });

  it('builds dashboard counts from due date and completion state', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-12T09:00:00.000Z'));

    findManyTasks.mockResolvedValue([
      { dueDate: null, completedAt: null, status: 'inbox', list: { slug: 'inbox' } },
      { dueDate: '2026-05-11', completedAt: null, status: 'inbox', list: { slug: 'work' } },
      { dueDate: '2026-05-12', completedAt: null, status: 'inbox', list: { slug: 'work' } },
      { dueDate: '2026-05-13', completedAt: null, status: 'inbox', list: { slug: 'work' } },
      { dueDate: '2026-05-12', completedAt: new Date('2026-05-12T01:00:00.000Z'), status: 'done', list: { slug: 'work' } },
    ]);

    await expect(listTaskDashboardCounts()).resolves.toEqual({
      inboxCount: 1,
      dueTodayCount: 1,
      dueTomorrowCount: 1,
      overdueCount: 1,
      completedCount: 1,
    });

    vi.useRealTimers();
  });

  it('lists task lists with counts from task instances', async () => {
    findManyTaskLists.mockResolvedValue([
      { id: 'list_inbox', name: '收集箱', icon: 'inbox', kind: 'system', slug: 'inbox' },
      { id: 'list_work', name: '工作', icon: 'briefcase', kind: 'user', slug: 'work' },
    ]);
    findManyTasks.mockResolvedValue([
      { listId: 'list_inbox' },
      { listId: 'list_work' },
      { listId: 'list_work' },
      { listId: null },
    ]);

    await expect(listTaskListsWithCounts()).resolves.toEqual([
      { id: 'list_inbox', name: '收集箱', icon: 'inbox', kind: 'system', slug: 'inbox', taskCount: 1 },
      { id: 'list_work', name: '工作', icon: 'briefcase', kind: 'user', slug: 'work', taskCount: 2 },
    ]);
  });

  it('builds smart and list task sources', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-12T09:00:00.000Z'));

    findManyTaskLists.mockResolvedValue([
      { id: 'list_inbox', name: '收集箱', icon: 'inbox', kind: 'system', slug: 'inbox' },
    ]);
    findManyTasks
      .mockResolvedValueOnce([{ listId: 'list_inbox' }, { listId: 'list_inbox' }])
      .mockResolvedValueOnce([
        { id: 'task_1', dueDate: '2026-05-12', list: { slug: 'inbox' } },
        { id: 'task_2', dueDate: '2026-05-13', list: { slug: 'inbox' } },
      ]);

    const sources = await listTaskSources();

    expect(sources.find((item) => item.id === 'all')?.count).toBe(2);
    expect(sources.find((item) => item.id === 'today')?.count).toBe(1);
    expect(sources.find((item) => item.id === 'tomorrow')?.count).toBe(1);
    expect(sources.find((item) => item.id === 'inbox')?.count).toBe(2);
    expect(sources.find((item) => item.id === 'list:list_inbox')?.title).toBe('收集箱');

    vi.useRealTimers();
  });

  it('groups tasks for a smart source and always returns completed group', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-12T09:00:00.000Z'));

    findManyTasks.mockResolvedValue([
      { id: 'task_today', dueDate: '2026-05-12', completedAt: null, list: { slug: 'inbox' } },
      { id: 'task_done', dueDate: '2026-05-12', completedAt: '2026-05-12T10:00:00.000Z', list: { slug: 'inbox' } },
      { id: 'task_tomorrow', dueDate: '2026-05-13', completedAt: null, list: { slug: 'inbox' } },
    ]);

    const groups = await listTasksForSource('today');

    expect(groups.find((group) => group.key === 'today')?.items).toHaveLength(1);
    expect(groups.find((group) => group.key === 'completed')?.items).toHaveLength(1);
    expect(groups).toHaveLength(6);

    vi.useRealTimers();
  });

  it('returns task detail with list, definition and KR links', async () => {
    findFirstTask.mockResolvedValue({
      id: 'task_1',
      title: 'Write review',
      list: { id: 'list_inbox', name: '收集箱' },
      definition: null,
      keyResultLinks: [{ keyResult: { id: 'kr_1', title: 'Weekly review ready' } }],
    });

    await expect(getTaskDetail('task_1')).resolves.toMatchObject({
      id: 'task_1',
      title: 'Write review',
      list: { name: '收集箱' },
      keyResultLinks: [{ keyResult: { id: 'kr_1' } }],
    });
  });

  it('creates a recurring task definition', async () => {
    insertValues.mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 'def_1', title: 'Daily triage', frequency: 'daily' }]),
    });

    await expect(createTaskDefinition({
      title: 'Daily triage',
      description: 'Inbox first',
      listId: 'list_inbox',
      frequency: 'daily',
      endType: 'never',
    })).resolves.toMatchObject({ id: 'def_1', frequency: 'daily' });
  });

  it('updates a recurring task definition', async () => {
    findFirstTaskDefinition.mockResolvedValue({
      id: 'def_1',
      title: 'Daily triage',
      description: 'Inbox first',
      listId: 'list_inbox',
      frequency: 'daily',
      endType: 'never',
      endDate: null,
      occurrenceCount: null,
    });
    updateReturning.mockResolvedValue([{ id: 'def_1', title: 'Morning triage', frequency: 'daily' }]);

    await expect(updateTaskDefinition('def_1', { title: 'Morning triage' })).resolves.toMatchObject({
      id: 'def_1',
      title: 'Morning triage',
    });
  });

  it('replaces recurring definition key result links', async () => {
    findManyTaskDefinitionKrLinks.mockResolvedValue([
      { definitionId: 'def_1', keyResultId: 'kr_1' },
      { definitionId: 'def_1', keyResultId: 'kr_2' },
    ]);

    await expect(replaceTaskDefinitionKeyResultLinks('def_1', ['kr_1', 'kr_2', 'kr_2'])).resolves.toHaveLength(2);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(txDelete).toHaveBeenCalled();
    expect(txInsertValues).toHaveBeenCalledWith([
      { definitionId: 'def_1', keyResultId: 'kr_1' },
      { definitionId: 'def_1', keyResultId: 'kr_2' },
    ]);
  });

  it('ensures recurring tasks for the date only once per definition', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-12T12:00:00.000Z'));

    findManyTaskDefinitions.mockResolvedValue([
      {
        id: 'def_1',
        title: 'Daily triage',
        description: 'Inbox first',
        listId: 'list_inbox',
        frequency: 'daily',
        endType: 'never',
        endDate: null,
        occurrenceCount: null,
        createdAt: new Date('2026-05-10T12:00:00.000Z'),
        keyResultLinks: [{ keyResultId: 'kr_1' }],
      },
    ]);
    findManyTasks.mockResolvedValueOnce([]);
    insertValues
      .mockReturnValueOnce({
        returning: vi.fn().mockResolvedValue([{ id: 'task_1' }]),
      })
      .mockReturnValueOnce(Promise.resolve());

    await expect(ensureRecurringTasksForDate('2026-05-12')).resolves.toEqual(['task_1']);

    expect(findManyTasks).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenNthCalledWith(1, expect.objectContaining({
      title: 'Daily triage',
      definitionId: 'def_1',
      occurrenceDate: '2026-05-12',
      dueDate: '2026-05-12',
    }));
    expect(insertValues).toHaveBeenNthCalledWith(2, [{ taskId: 'task_1', keyResultId: 'kr_1' }]);

    vi.useRealTimers();
  });

  it('skips weekly recurring generation on non-anchor weekday', async () => {
    findManyTaskDefinitions.mockResolvedValue([
      {
        id: 'def_1',
        title: 'Weekly planning',
        description: null,
        listId: 'list_work',
        frequency: 'weekly',
        endType: 'never',
        endDate: null,
        occurrenceCount: null,
        createdAt: new Date('2026-05-05T12:00:00.000Z'),
        keyResultLinks: [],
      },
    ]);
    findManyTasks.mockResolvedValueOnce([
      {
        id: 'task_prev',
        occurrenceDate: '2026-05-05',
        createdAt: new Date('2026-05-05T12:00:00.000Z'),
      },
    ]);

    await expect(ensureRecurringTasksForDate('2026-05-13')).resolves.toEqual([]);

    expect(insertValues).not.toHaveBeenCalled();
  });

  it('uses target date as anchor for first weekly occurrence when no history exists', async () => {
    findManyTaskDefinitions.mockResolvedValue([
      {
        id: 'def_1',
        title: 'Friday planning',
        description: null,
        listId: 'list_work',
        frequency: 'weekly',
        endType: 'never',
        endDate: null,
        occurrenceCount: null,
        createdAt: new Date('2026-05-12T12:00:00.000Z'),
        keyResultLinks: [],
      },
    ]);
    findManyTasks.mockResolvedValueOnce([]);
    insertValues.mockReturnValueOnce({
      returning: vi.fn().mockResolvedValue([{ id: 'task_1' }]),
    });

    await expect(ensureRecurringTasksForDate('2026-05-15')).resolves.toEqual(['task_1']);

    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Friday planning',
      definitionId: 'def_1',
      occurrenceDate: '2026-05-15',
      dueDate: '2026-05-15',
    }));
  });

  it('skips after_count recurring generation once count limit is reached', async () => {
    findManyTaskDefinitions.mockResolvedValue([
      {
        id: 'def_1',
        title: 'Habit',
        description: null,
        listId: 'list_work',
        frequency: 'daily',
        endType: 'after_count',
        endDate: null,
        occurrenceCount: 2,
        createdAt: new Date('2026-05-10T12:00:00.000Z'),
        keyResultLinks: [],
      },
    ]);
    findManyTasks.mockResolvedValueOnce([
      {
        id: 'task_1',
        occurrenceDate: '2026-05-10',
        createdAt: new Date('2026-05-10T12:00:00.000Z'),
      },
      {
        id: 'task_2',
        occurrenceDate: '2026-05-11',
        createdAt: new Date('2026-05-11T12:00:00.000Z'),
      },
    ]);

    await expect(ensureRecurringTasksForDate('2026-05-12')).resolves.toEqual([]);

    expect(insertValues).not.toHaveBeenCalled();
  });
});
