import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordActivity = vi.fn();
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

vi.mock('@/lib/services/activity-service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/activity-service')>('@/lib/services/activity-service');
  return {
    ...actual,
    recordActivity: (...args: unknown[]) => recordActivity(...args),
  };
});

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
      archivedAt: {},
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
  buildQuadrantDefaults,
  buildTaskUpdatePatch,
  archiveTask,
  createTask,
  createTaskDefinition,
  getTaskDetail,
  ensureRecurringTasksForDate,
  getCalendarDayDelta,
  getTaskQuadrant,
  getTaskUrgencyBand,
  listQuadrantBoard,
  listTaskDashboardCounts,
  listTaskListsWithCounts,
  listTaskSources,
  listTasksForKeyResult,
  listTasksForSource,
  moveTaskToQuadrant,
  moveTaskToQuadrantList,
  replaceTaskDefinitionKeyResultLinks,
  replaceTaskKeyResultLinks,
  toggleTaskCompletion,
  updateTaskDefinition,
  updateTask,
} from '@/lib/services/task-service';

describe('task service rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordActivity.mockResolvedValue(undefined);
    txDeleteWhere.mockResolvedValue(undefined);
    txInsertValues.mockResolvedValue(undefined);
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

  it('computes calendar day delta in date-only semantics', () => {
    expect(getCalendarDayDelta('2026-05-12', '2026-05-12')).toBe(0);
    expect(getCalendarDayDelta('2026-05-19', '2026-05-12')).toBe(7);
    expect(getCalendarDayDelta('2026-05-20', '2026-05-12')).toBe(8);
    expect(getCalendarDayDelta(null, '2026-05-12')).toBeNull();
  });

  it('maps urgency band from due date threshold', () => {
    expect(getTaskUrgencyBand('2026-05-12', '2026-05-12')).toBe('high');
    expect(getTaskUrgencyBand('2026-05-19', '2026-05-12')).toBe('high');
    expect(getTaskUrgencyBand('2026-05-20', '2026-05-12')).toBe('low');
    expect(getTaskUrgencyBand(null, '2026-05-12')).toBeNull();
  });

  it('maps tasks into quadrants from priority and due date', () => {
    expect(getTaskQuadrant({ priority: 'P1', dueDate: '2026-05-12' }, '2026-05-12')).toBe('Q1');
    expect(getTaskQuadrant({ priority: 'P2', dueDate: '2026-05-20' }, '2026-05-12')).toBe('Q2');
    expect(getTaskQuadrant({ priority: 'P3', dueDate: '2026-05-12' }, '2026-05-12')).toBe('Q3');
    expect(getTaskQuadrant({ priority: null, dueDate: '2026-06-11' }, '2026-05-12')).toBe('Q4');
  });

  it('maps tasks without due date directly from priority', () => {
    expect(getTaskQuadrant({ priority: 'P1', dueDate: null }, '2026-05-12')).toBe('Q1');
    expect(getTaskQuadrant({ priority: 'P2', dueDate: null }, '2026-05-12')).toBe('Q2');
    expect(getTaskQuadrant({ priority: 'P3', dueDate: null }, '2026-05-12')).toBe('Q3');
    expect(getTaskQuadrant({ priority: null, dueDate: null }, '2026-05-12')).toBe('Q4');
  });

  it('builds the unique default reverse mapping for each quadrant', () => {
    expect(buildQuadrantDefaults('Q1', '2026-05-12')).toEqual({ priority: 'P1', dueDate: '2026-05-12' });
    expect(buildQuadrantDefaults('Q2', '2026-05-12')).toEqual({ priority: 'P2', dueDate: '2026-05-20' });
    expect(buildQuadrantDefaults('Q3', '2026-05-12')).toEqual({ priority: 'P3', dueDate: '2026-05-12' });
    expect(buildQuadrantDefaults('Q4', '2026-05-12')).toEqual({ priority: null, dueDate: '2026-05-20' });
  });

  it('replaces task key result links and reads linked records outside the transaction', async () => {
    findFirstTask.mockResolvedValue({
      id: 'task_1',
      title: 'Write review',
      status: 'inbox',
      dueDate: null,
      priority: 'P1',
      listId: 'list_1',
      completedAt: null,
    });
    findManyTaskKrLinks.mockResolvedValue([
      { taskId: 'task_1', keyResultId: 'kr_1' },
      { taskId: 'task_1', keyResultId: 'kr_2' },
    ]);

    await expect(replaceTaskKeyResultLinks('task_1', [
      { keyResultId: 'kr_1', countsTowardCommitment: true },
      { keyResultId: 'kr_1', countsTowardCommitment: true },
      { keyResultId: 'kr_2', countsTowardCommitment: false },
    ])).resolves.toHaveLength(2);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(txDelete).toHaveBeenCalled();
    expect(txInsertValues).toHaveBeenCalledWith([
      { taskId: 'task_1', keyResultId: 'kr_1', countsTowardCommitment: true, committedAt: expect.any(Date) },
      { taskId: 'task_1', keyResultId: 'kr_2', countsTowardCommitment: false, committedAt: null },
    ]);
    expect(findManyTaskKrLinks).toHaveBeenCalledTimes(2);
  });

  it('clears task key result links without querying when no key results are selected', async () => {
    findFirstTask.mockResolvedValue({
      id: 'task_1',
      title: 'Write review',
      status: 'inbox',
      dueDate: null,
      priority: 'P1',
      listId: 'list_1',
      completedAt: null,
    });
    findManyTaskKrLinks.mockResolvedValue([{ taskId: 'task_1', keyResultId: 'kr_1' }]);
    await expect(replaceTaskKeyResultLinks('task_1', [])).resolves.toEqual([]);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(txDelete).toHaveBeenCalled();
    expect(txInsert).not.toHaveBeenCalled();
    expect(findManyTaskKrLinks).toHaveBeenCalledTimes(1);
  });

  it('returns linked tasks with the current key result commitment metadata', async () => {
    const committedAt = new Date('2026-05-12T08:00:00.000Z');
    findManyTaskKrLinks.mockResolvedValue([
      {
        keyResultId: 'kr_1',
        countsTowardCommitment: true,
        committedAt,
        task: {
          id: 'task_1',
          title: 'Committed task',
          keyResultLinks: [],
        },
      },
      {
        keyResultId: 'kr_1',
        countsTowardCommitment: false,
        committedAt: null,
        task: {
          id: 'task_2',
          title: 'Linked task',
        },
      },
    ]);

    await expect(listTasksForKeyResult('kr_1')).resolves.toEqual([
      expect.objectContaining({
        id: 'task_1',
        keyResultLinks: [expect.objectContaining({
          keyResultId: 'kr_1',
          countsTowardCommitment: true,
          committedAt,
          keyResult: { id: 'kr_1' },
        })],
      }),
      expect.objectContaining({
        id: 'task_2',
        keyResultLinks: [expect.objectContaining({
          keyResultId: 'kr_1',
          countsTowardCommitment: false,
          committedAt: null,
          keyResult: { id: 'kr_1' },
        })],
      }),
    ]);
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

  it('builds a quadrant board with open and completed groups', async () => {
    findManyTasks.mockResolvedValue([
      {
        id: 'task_q1',
        title: 'Hot priority',
        dueDate: '2026-05-12',
        priority: 'P1',
        completedAt: null,
        status: 'inbox',
        listId: 'list_work',
        list: { id: 'list_work', name: '工作任务', icon: 'briefcase' },
      },
      {
        id: 'task_q4_done',
        title: 'Done later',
        dueDate: '2026-06-11',
        priority: null,
        completedAt: '2026-05-12T10:00:00.000Z',
        status: 'done',
        listId: 'list_inbox',
        list: { id: 'list_inbox', name: '收集箱', icon: 'inbox' },
      },
    ]);

    const board = await listQuadrantBoard({ today: '2026-05-12', includeCompleted: true });

    expect(board.quadrants.find((quadrant) => quadrant.key === 'Q1')?.groups[0]?.items[0]?.id).toBe('task_q1');
    expect(board.quadrants.find((quadrant) => quadrant.key === 'Q4')?.completedGroups[0]?.items[0]?.id).toBe('task_q4_done');
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

  it('moves a task to a quadrant through the default reverse map', async () => {
    findFirstTask.mockResolvedValue({
      id: 'task_1',
      title: 'Hot priority',
      status: 'inbox',
      dueDate: '2026-05-12',
      priority: 'P1',
      listId: 'list_work',
      completedAt: null,
    });
    updateReturning.mockResolvedValue([{ id: 'task_1', priority: 'P2', dueDate: '2026-05-20' }]);

    await expect(moveTaskToQuadrant('task_1', 'Q2', '2026-05-12')).resolves.toMatchObject({
      id: 'task_1',
      priority: 'P2',
      dueDate: '2026-05-20',
    });
  });

  it('moves a task to another list without changing quadrant fields', async () => {
    findFirstTask.mockResolvedValue({
      id: 'task_1',
      title: 'Hot priority',
      status: 'inbox',
      dueDate: '2026-05-12',
      priority: 'P1',
      listId: 'list_work',
      completedAt: null,
    });
    updateReturning.mockResolvedValue([{ id: 'task_1', listId: 'list_2' }]);

    await expect(moveTaskToQuadrantList('task_1', 'list_2')).resolves.toMatchObject({
      id: 'task_1',
      listId: 'list_2',
    });
  });

  it('moves a task to the unassigned bucket with null listId', async () => {
    findFirstTask.mockResolvedValue({
      id: 'task_1',
      title: 'Hot priority',
      status: 'inbox',
      dueDate: '2026-05-12',
      priority: 'P1',
      listId: 'list_work',
      completedAt: null,
    });
    updateReturning.mockResolvedValue([{ id: 'task_1', listId: null }]);

    await expect(moveTaskToQuadrantList('task_1', null)).resolves.toMatchObject({
      id: 'task_1',
      listId: null,
    });
  });

  it('archives a task by setting archivedAt', async () => {
    findFirstTask.mockResolvedValue({
      id: 'task_1',
      title: 'Archive me',
      status: 'inbox',
      dueDate: '2026-05-12',
      priority: 'P2',
      listId: 'list_1',
      completedAt: null,
    });
    updateReturning.mockResolvedValue([{ id: 'task_1', archivedAt: new Date('2026-05-12T10:00:00.000Z') }]);

    await expect(archiveTask('task_1')).resolves.toMatchObject({ id: 'task_1' });
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      archivedAt: expect.any(Date),
      updatedAt: expect.any(Date),
    }));
  });

  it('records activity for create, update, complete, archive, and link changes when context exists', async () => {
    insertValues.mockReturnValueOnce({
      returning: vi.fn().mockResolvedValue([{
        id: 'task_1',
        title: 'Write review',
        status: 'inbox',
        dueDate: null,
        priority: 'P1',
        listId: null,
        completedAt: null,
      }]),
    });

    await createTask({
      title: 'Write review',
      priority: 'P1',
    }, {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });

    findFirstTask.mockResolvedValue({
      id: 'task_1',
      title: 'Write review',
      status: 'inbox',
      dueDate: null,
      priority: 'P1',
      listId: null,
      completedAt: null,
    });
    updateReturning.mockResolvedValueOnce([{
      id: 'task_1',
      title: 'Write better review',
      status: 'inbox',
      dueDate: '2026-05-12',
      priority: 'P2',
      listId: 'list_1',
      completedAt: null,
    }]);

    await updateTask('task_1', {
      title: 'Write better review',
      dueDate: '2026-05-12',
      priority: 'P2',
      listId: 'list_1',
    }, {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });

    findFirstTask.mockResolvedValue({
      id: 'task_1',
      title: 'Write better review',
      status: 'inbox',
      dueDate: '2026-05-12',
      priority: 'P2',
      listId: 'list_1',
      completedAt: null,
    });
    updateReturning.mockResolvedValueOnce([{
      id: 'task_1',
      title: 'Write better review',
      status: 'done',
      dueDate: '2026-05-12',
      priority: 'P2',
      listId: 'list_1',
      completedAt: new Date('2026-05-12T12:00:00.000Z'),
    }]);

    await toggleTaskCompletion('task_1', true, {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });

    findFirstTask.mockResolvedValue({
      id: 'task_1',
      title: 'Write better review',
      status: 'done',
      dueDate: '2026-05-12',
      priority: 'P2',
      listId: 'list_1',
      completedAt: new Date('2026-05-12T12:00:00.000Z'),
    });
    updateReturning.mockResolvedValueOnce([{
      id: 'task_1',
      title: 'Write better review',
      status: 'done',
      dueDate: '2026-05-12',
      priority: 'P2',
      listId: 'list_1',
      completedAt: new Date('2026-05-12T12:00:00.000Z'),
      archivedAt: new Date('2026-05-12T13:00:00.000Z'),
    }]);

    await archiveTask('task_1', {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });

    findFirstTask.mockResolvedValue({
      id: 'task_1',
      title: 'Write better review',
      status: 'done',
      dueDate: '2026-05-12',
      priority: 'P2',
      listId: 'list_1',
      completedAt: new Date('2026-05-12T12:00:00.000Z'),
    });
    findManyTaskKrLinks
      .mockResolvedValueOnce([{ taskId: 'task_1', keyResultId: 'kr_1' }])
      .mockResolvedValueOnce([
        { taskId: 'task_1', keyResultId: 'kr_1' },
        { taskId: 'task_1', keyResultId: 'kr_2' },
      ]);

    await replaceTaskKeyResultLinks('task_1', ['kr_1', 'kr_2'], {
      activityContext: { actorType: 'user', actorId: 'user_1', source: 'web' },
    });

    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'task.create',
      targetTitle: 'Write review',
    }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'task.update',
      targetTitle: 'Write better review',
      metadata: expect.objectContaining({
        changedFields: expect.arrayContaining(['title', 'dueDate', 'priority', 'listId']),
      }),
    }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'task.complete',
      targetTitle: 'Write better review',
    }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'task.archive',
      targetTitle: 'Write better review',
    }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'task.link_key_result',
      metadata: expect.objectContaining({
        keyResultId: 'kr_2',
      }),
    }));
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

    await expect(replaceTaskDefinitionKeyResultLinks('def_1', [
      { keyResultId: 'kr_1', countsTowardCommitment: true },
      { keyResultId: 'kr_2', countsTowardCommitment: false },
      { keyResultId: 'kr_2', countsTowardCommitment: false },
    ])).resolves.toHaveLength(2);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(txDelete).toHaveBeenCalled();
    expect(txInsertValues).toHaveBeenCalledWith([
      { definitionId: 'def_1', keyResultId: 'kr_1', countsTowardCommitment: true, committedAt: expect.any(Date) },
      { definitionId: 'def_1', keyResultId: 'kr_2', countsTowardCommitment: false, committedAt: null },
    ]);
  });

  it('awaits transaction writes before reading recurring definition key result links', async () => {
    const order: string[] = [];
    txDeleteWhere.mockImplementationOnce(async () => {
      order.push('delete');
    });
    txInsertValues.mockImplementationOnce(async () => {
      order.push('insert');
    });
    findManyTaskDefinitionKrLinks.mockImplementationOnce(async () => {
      order.push('read');
      return [{ definitionId: 'def_1', keyResultId: 'kr_1' }];
    });

    await replaceTaskDefinitionKeyResultLinks('def_1', [
      { keyResultId: 'kr_1', countsTowardCommitment: true },
    ]);

    expect(order).toEqual(['delete', 'insert', 'read']);
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
        keyResultLinks: [
          {
            keyResultId: 'kr_1',
            countsTowardCommitment: true,
            committedAt: new Date('2026-05-10T12:00:00.000Z'),
          },
          {
            keyResultId: 'kr_2',
            countsTowardCommitment: false,
            committedAt: null,
          },
        ],
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
    expect(insertValues).toHaveBeenNthCalledWith(2, [
      {
        taskId: 'task_1',
        keyResultId: 'kr_1',
        countsTowardCommitment: true,
        committedAt: new Date('2026-05-10T12:00:00.000Z'),
      },
      {
        taskId: 'task_1',
        keyResultId: 'kr_2',
        countsTowardCommitment: false,
        committedAt: null,
      },
    ]);

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
