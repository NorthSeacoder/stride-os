import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionUser = vi.fn();
const createTask = vi.fn();
const replaceTaskKeyResultLinks = vi.fn();
const revalidatePath = vi.fn();
const auditValues = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: () => getSessionUser(),
}));

vi.mock('@/lib/services/task-service', () => ({
  cancelTask: vi.fn(),
  completeTask: vi.fn(),
  createTask: (...args: unknown[]) => createTask(...args),
  moveTaskToToday: vi.fn(),
  replaceTaskKeyResultLinks: (...args: unknown[]) => replaceTaskKeyResultLinks(...args),
  scheduleTask: vi.fn(),
  updateTask: vi.fn(),
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

import { createTaskAction } from '@/app/(dashboard)/tasks/actions';

describe('task actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when no session user exists', async () => {
    getSessionUser.mockResolvedValue(null);

    const formData = new FormData();
    formData.set('title', 'Write review');

    await expect(createTaskAction({ error: '' }, formData)).resolves.toEqual({
      error: '未授权',
    });
  });

  it('returns validation error for blank title', async () => {
    getSessionUser.mockResolvedValue({ id: 'user_1' });

    const formData = new FormData();
    formData.set('title', '   ');

    await expect(createTaskAction({ error: '' }, formData)).resolves.toEqual({
      error: '标题不能为空',
    });
  });

  it('creates a task and forwards selected key results', async () => {
    getSessionUser.mockResolvedValue({ id: 'user_1' });
    createTask.mockResolvedValue({ id: 'task_1' });
    replaceTaskKeyResultLinks.mockResolvedValue([]);
    auditValues.mockResolvedValue(undefined);

    const formData = new FormData();
    formData.set('title', 'Write review');
    formData.set('status', 'today');
    formData.set('todayType', 'must');
    formData.append('keyResultIds', 'kr_1');
    formData.append('keyResultIds', 'kr_2');

    await expect(createTaskAction({ error: '' }, formData)).resolves.toEqual({
      error: '',
    });

    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Write review',
        status: 'today',
        todayType: 'must',
      }),
    );
    expect(replaceTaskKeyResultLinks).toHaveBeenCalledWith('task_1', ['kr_1', 'kr_2']);
    expect(revalidatePath).toHaveBeenCalledWith('/tasks');
  });

  it('creates a scheduled task with selected dates', async () => {
    getSessionUser.mockResolvedValue({ id: 'user_1' });
    createTask.mockResolvedValue({ id: 'task_1' });
    replaceTaskKeyResultLinks.mockResolvedValue([]);
    auditValues.mockResolvedValue(undefined);

    const formData = new FormData();
    formData.set('title', 'Plan launch');
    formData.set('status', 'scheduled');
    formData.set('scheduledDate', '2026-05-12');
    formData.set('dueDate', '2026-05-20');

    await expect(createTaskAction({ error: '' }, formData)).resolves.toEqual({
      error: '',
    });

    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Plan launch',
        status: 'scheduled',
        scheduledDate: '2026-05-12',
        dueDate: '2026-05-20',
      }),
    );
  });
});
