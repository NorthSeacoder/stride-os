import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionUser = vi.fn();
const moveTaskToQuadrant = vi.fn();
const moveTaskToQuadrantList = vi.fn();
const toggleTaskCompletion = vi.fn();
const revalidatePath = vi.fn();
const auditValues = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: () => getSessionUser(),
}));

vi.mock('@/lib/services/task-service', () => ({
  moveTaskToQuadrant: (...args: unknown[]) => moveTaskToQuadrant(...args),
  moveTaskToQuadrantList: (...args: unknown[]) => moveTaskToQuadrantList(...args),
  toggleTaskCompletion: (...args: unknown[]) => toggleTaskCompletion(...args),
}));

vi.mock('@stride-os/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: (...args: unknown[]) => auditValues(...args),
    })),
  },
  schema: {
    auditLogs: {},
  },
}));

import {
  moveTaskToQuadrantAction,
  moveTaskToQuadrantListAction,
  toggleQuadrantTaskCompletionAction,
} from '@/app/(dashboard)/quadrants/actions';

describe('quadrants action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when user is missing', async () => {
    getSessionUser.mockResolvedValue(null);

    await expect(moveTaskToQuadrantAction('task_1', 'Q1')).resolves.toEqual({
      error: '未授权',
    });

    expect(moveTaskToQuadrant).not.toHaveBeenCalled();
  });

  it('moves a task to a target quadrant through the new service', async () => {
    getSessionUser.mockResolvedValue({ id: 'user_1' });
    moveTaskToQuadrant.mockResolvedValue({ id: 'task_1' });
    auditValues.mockResolvedValue(undefined);

    await expect(moveTaskToQuadrantAction('task_1', 'Q2')).resolves.toEqual({ error: '' });

    expect(moveTaskToQuadrant).toHaveBeenCalledWith('task_1', 'Q2');
    expect(revalidatePath).toHaveBeenCalledWith('/quadrants');
    expect(revalidatePath).toHaveBeenCalledWith('/tasks');
  });

  it('moves a task to another list inside a quadrant', async () => {
    getSessionUser.mockResolvedValue({ id: 'user_1' });
    moveTaskToQuadrantList.mockResolvedValue({ id: 'task_1' });
    auditValues.mockResolvedValue(undefined);

    await expect(moveTaskToQuadrantListAction('task_1', 'list_2')).resolves.toEqual({ error: '' });

    expect(moveTaskToQuadrantList).toHaveBeenCalledWith('task_1', 'list_2');
  });

  it('moves a task to the unassigned bucket with null listId', async () => {
    getSessionUser.mockResolvedValue({ id: 'user_1' });
    moveTaskToQuadrantList.mockResolvedValue({ id: 'task_1' });
    auditValues.mockResolvedValue(undefined);

    await expect(moveTaskToQuadrantListAction('task_1', null)).resolves.toEqual({ error: '' });

    expect(moveTaskToQuadrantList).toHaveBeenCalledWith('task_1', null);
  });

  it('toggles completion from the quadrant page', async () => {
    getSessionUser.mockResolvedValue({ id: 'user_1' });
    toggleTaskCompletion.mockResolvedValue({ id: 'task_1' });
    auditValues.mockResolvedValue(undefined);

    await expect(toggleQuadrantTaskCompletionAction('task_1', true)).resolves.toEqual({ error: '' });

    expect(toggleTaskCompletion).toHaveBeenCalledWith('task_1', true);
  });

  it('returns not found when the move service returns null', async () => {
    getSessionUser.mockResolvedValue({ id: 'user_1' });
    moveTaskToQuadrant.mockResolvedValue(null);

    await expect(moveTaskToQuadrantAction('task_1', 'Q3')).resolves.toEqual({
      error: '未找到任务',
    });
  });
});
