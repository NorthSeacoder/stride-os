import { beforeEach, describe, expect, it, vi } from 'vitest';

const txDeleteWhere = vi.fn();
const txDelete = vi.fn(() => ({ where: txDeleteWhere }));
const txInsertValues = vi.fn();
const txInsert = vi.fn(() => ({ values: txInsertValues }));
const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({
  delete: txDelete,
  insert: txInsert,
}));
const findManyTaskKrLinks = vi.fn();
const findManyTasks = vi.fn();

vi.mock('@stride-os/db', () => ({
  db: {
    transaction: (callback: (tx: unknown) => Promise<unknown>) => transaction(callback),
    query: {
      taskKrLinks: {
        findMany: (...args: unknown[]) => findManyTaskKrLinks(...args),
      },
      tasks: {
        findMany: (...args: unknown[]) => findManyTasks(...args),
      },
    },
  },
  schema: {
    taskKrLinks: {
      taskId: {},
      keyResultId: {},
      createdAt: {},
    },
    tasks: {
      status: {},
    },
  },
}));

import { buildTaskUpdatePatch, listTaskStatusCounts, replaceTaskKeyResultLinks } from '@/lib/services/task-service';

describe('task service rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txDelete.mockReturnValue({ where: txDeleteWhere });
    txInsert.mockReturnValue({ values: txInsertValues });
    transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
      delete: txDelete,
      insert: txInsert,
    }));
  });

  it('requires today type when moving a task into today', () => {
    expect(() => buildTaskUpdatePatch({ status: 'today' })).toThrow(
      '把任务移入“今日”时，必须指定为“必做”或“专注”。',
    );
  });

  it('adds completedAt when status becomes done', () => {
    const patch = buildTaskUpdatePatch({ status: 'done' });
    expect(patch.completedAt).toBeInstanceOf(Date);
  });

  it('clears today type when leaving today', () => {
    const patch = buildTaskUpdatePatch({ status: 'inbox' });
    expect(patch.todayType).toBeNull();
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

  it('counts tasks by status for dashboard charts', async () => {
    findManyTasks.mockResolvedValue([
      { status: 'inbox' },
      { status: 'today' },
      { status: 'today' },
      { status: 'scheduled' },
      { status: 'done' },
    ]);

    await expect(listTaskStatusCounts()).resolves.toEqual({
      inbox: 1,
      today: 2,
      scheduled: 1,
      done: 1,
      canceled: 0,
    });
  });
});
