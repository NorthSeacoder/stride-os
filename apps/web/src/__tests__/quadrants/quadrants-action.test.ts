import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionUser = vi.fn();
const updateTaskQuadrant = vi.fn();
const revalidatePath = vi.fn();
const auditValues = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: () => getSessionUser(),
}));

vi.mock('@/lib/services/task-service', () => ({
  updateTaskQuadrant: (...args: unknown[]) => updateTaskQuadrant(...args),
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

import { updateTaskQuadrantAction } from '@/app/(dashboard)/quadrants/actions';

describe('quadrants action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when user is missing', async () => {
    getSessionUser.mockResolvedValue(null);

    await expect(updateTaskQuadrantAction('task_1', { important: true, urgent: false })).resolves.toEqual({
      error: '未授权',
    });

    expect(updateTaskQuadrant).not.toHaveBeenCalled();
  });

  it('updates only important and urgent flags through task service', async () => {
    getSessionUser.mockResolvedValue({ id: 'user_1' });
    updateTaskQuadrant.mockResolvedValue({ id: 'task_1' });
    auditValues.mockResolvedValue(undefined);

    await expect(updateTaskQuadrantAction('task_1', { important: true, urgent: false })).resolves.toEqual({
      error: '',
    });

    expect(updateTaskQuadrant).toHaveBeenCalledWith('task_1', {
      important: true,
      urgent: false,
    });
    expect(revalidatePath).toHaveBeenCalledWith('/quadrants');
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  it('returns not found when task service returns null', async () => {
    getSessionUser.mockResolvedValue({ id: 'user_1' });
    updateTaskQuadrant.mockResolvedValue(null);

    await expect(updateTaskQuadrantAction('task_1', { important: true, urgent: false })).resolves.toEqual({
      error: '未找到任务',
    });

    expect(auditValues).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
