import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionUser = vi.fn();
const createTask = vi.fn();
const createTaskDefinition = vi.fn();
const createTaskList = vi.fn();
const ensureRecurringTasksForDate = vi.fn();
const replaceTaskKeyResultLinks = vi.fn();
const replaceTaskDefinitionKeyResultLinks = vi.fn();
const toggleTaskCompletion = vi.fn();
const updateTask = vi.fn();
const updateTaskDefinition = vi.fn();
const revalidatePath = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: () => getSessionUser(),
}));

vi.mock('@/lib/services/task-service', () => ({
  cancelTask: vi.fn(),
  completeTask: vi.fn(),
  createTaskDefinition: (...args: unknown[]) => createTaskDefinition(...args),
  createTaskList: (...args: unknown[]) => createTaskList(...args),
  createTask: (...args: unknown[]) => createTask(...args),
  ensureRecurringTasksForDate: (...args: unknown[]) => ensureRecurringTasksForDate(...args),
  moveTaskToToday: vi.fn(),
  replaceTaskDefinitionKeyResultLinks: (...args: unknown[]) => replaceTaskDefinitionKeyResultLinks(...args),
  replaceTaskKeyResultLinks: (...args: unknown[]) => replaceTaskKeyResultLinks(...args),
  scheduleTask: vi.fn(),
  toggleTaskCompletion: (...args: unknown[]) => toggleTaskCompletion(...args),
  updateTask: (...args: unknown[]) => updateTask(...args),
  updateTaskDefinition: (...args: unknown[]) => updateTaskDefinition(...args),
}));

import {
  createTaskAction,
  createTaskDefinitionAction,
  createTaskListAction,
  toggleTaskCompletionAction,
  updateTaskAction,
  updateTaskDefinitionAction,
} from '@/app/(dashboard)/tasks/actions';

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
    const formData = new FormData();
    formData.set('title', 'Write review');
    formData.set('description', 'Keep it short');
    formData.set('listId', 'list_1');
    formData.set('dueDate', '2026-05-12');
    formData.set('priority', 'P1');
    formData.append('keyResultIds', 'kr_1');
    formData.append('keyResultIds', 'kr_2');

    await expect(createTaskAction({ error: '' }, formData)).resolves.toEqual({
      error: '',
    });

    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Write review',
        description: 'Keep it short',
        listId: 'list_1',
        dueDate: '2026-05-12',
        priority: 'P1',
      }),
      expect.objectContaining({
        activityContext: expect.objectContaining({
          actorId: 'user_1',
          source: 'web',
        }),
      }),
    );
    expect(replaceTaskKeyResultLinks).toHaveBeenCalledWith('task_1', ['kr_1', 'kr_2'], expect.objectContaining({
      activityContext: expect.objectContaining({
        actorId: 'user_1',
        source: 'web',
      }),
    }));
    expect(revalidatePath).toHaveBeenCalledWith('/tasks');
    expect(revalidatePath).toHaveBeenCalledWith('/activity');
  });

  it('creates a task with due date only in the unified form', async () => {
    getSessionUser.mockResolvedValue({ id: 'user_1' });
    createTask.mockResolvedValue({ id: 'task_1' });
    replaceTaskKeyResultLinks.mockResolvedValue([]);
    const formData = new FormData();
    formData.set('title', 'Plan launch');
    formData.set('description', 'Prepare the launch checklist');
    formData.set('listId', 'list_work');
    formData.set('dueDate', '2026-05-20');
    formData.set('priority', 'P2');

    await expect(createTaskAction({ error: '' }, formData)).resolves.toEqual({
      error: '',
    });

    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Plan launch',
        description: 'Prepare the launch checklist',
        listId: 'list_work',
        dueDate: '2026-05-20',
        priority: 'P2',
      }),
      expect.objectContaining({
        activityContext: expect.objectContaining({
          actorId: 'user_1',
          source: 'web',
        }),
      }),
    );
  });

  it('creates a task list', async () => {
    getSessionUser.mockResolvedValue({ id: 'user_1' });
    createTaskList.mockResolvedValue({ id: 'list_1' });
    const formData = new FormData();
    formData.set('name', '工作');
    formData.set('icon', 'briefcase');

    await expect(createTaskListAction({ error: '' }, formData)).resolves.toEqual({ error: '' });

    expect(createTaskList).toHaveBeenCalledWith({
      name: '工作',
      icon: 'briefcase',
    });
  });

  it('creates a recurring task definition and ensures tasks for the target date', async () => {
    getSessionUser.mockResolvedValue({ id: 'user_1' });
    createTaskDefinition.mockResolvedValue({ id: 'def_1' });
    replaceTaskDefinitionKeyResultLinks.mockResolvedValue([]);
    ensureRecurringTasksForDate.mockResolvedValue(['task_1']);
    const formData = new FormData();
    formData.set('title', 'Daily triage');
    formData.set('listId', 'list_inbox');
    formData.set('frequency', 'daily');
    formData.set('endType', 'never');
    formData.set('targetDate', '2026-05-12');
    formData.append('keyResultIds', 'kr_1');

    await expect(createTaskDefinitionAction({ error: '' }, formData)).resolves.toEqual({ error: '' });

    expect(createTaskDefinition).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Daily triage',
      listId: 'list_inbox',
      frequency: 'daily',
      endType: 'never',
    }));
    expect(replaceTaskDefinitionKeyResultLinks).toHaveBeenCalledWith('def_1', ['kr_1']);
    expect(ensureRecurringTasksForDate).toHaveBeenCalledWith('2026-05-12');
  });

  it('updates a recurring task definition', async () => {
    getSessionUser.mockResolvedValue({ id: 'user_1' });
    updateTaskDefinition.mockResolvedValue({ id: 'def_1' });
    replaceTaskDefinitionKeyResultLinks.mockResolvedValue([]);
    ensureRecurringTasksForDate.mockResolvedValue([]);
    const formData = new FormData();
    formData.set('id', 'task_1');
    formData.set('definitionId', 'def_1');
    formData.set('title', 'Morning triage');
    formData.set('listId', 'list_inbox');
    formData.set('frequency', 'daily');
    formData.set('endType', 'never');

    await expect(updateTaskDefinitionAction({ error: '' }, formData)).resolves.toEqual({ error: '' });

    expect(updateTaskDefinition).toHaveBeenCalledWith('def_1', expect.objectContaining({
      title: 'Morning triage',
    }));
  });

  it('updates a normal task by taskId even when form id is a definition id', async () => {
    getSessionUser.mockResolvedValue({ id: 'user_1' });
    updateTask.mockResolvedValue({ id: 'task_1' });
    replaceTaskKeyResultLinks.mockResolvedValue([]);

    const formData = new FormData();
    formData.set('id', 'def_1');
    formData.set('taskId', 'task_1');
    formData.set('title', 'Refine workspace');
    formData.set('listId', 'list_work');
    formData.set('priority', 'P3');

    await expect(updateTaskAction({ error: '' }, formData)).resolves.toEqual({ error: '' });

    expect(updateTask).toHaveBeenCalledWith('task_1', expect.objectContaining({
      title: 'Refine workspace',
      priority: 'P3',
    }), expect.objectContaining({
      activityContext: expect.objectContaining({
        actorId: 'user_1',
        source: 'web',
      }),
    }));
  });

  it('toggles task completion and revalidates tasks', async () => {
    getSessionUser.mockResolvedValue({ id: 'user_1' });
    toggleTaskCompletion.mockResolvedValue({ id: 'task_1' });
    await toggleTaskCompletionAction('task_1', true);

    expect(toggleTaskCompletion).toHaveBeenCalledWith('task_1', true, expect.objectContaining({
      activityContext: expect.objectContaining({
        actorId: 'user_1',
        source: 'web',
      }),
    }));
    expect(revalidatePath).toHaveBeenCalledWith('/tasks');
    expect(revalidatePath).toHaveBeenCalledWith('/activity');
  });
});
