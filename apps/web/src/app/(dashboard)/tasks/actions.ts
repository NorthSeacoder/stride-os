'use server';

import { revalidatePath } from 'next/cache';
import { db, schema } from '@stride-os/db';
import { getSessionUser } from '@/lib/auth/session';
import {
  cancelTask,
  completeTask,
  createTask,
  moveTaskToToday,
  scheduleTask,
  updateTask,
  replaceTaskKeyResultLinks,
  type TodayType,
  type TaskStatus,
} from '@/lib/services/task-service';

export type TaskActionState = {
  error: string;
};

const initialState: TaskActionState = {
  error: '',
};

function getTrimmed(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function getNullable(formData: FormData, key: string) {
  const value = getTrimmed(formData, key);
  return value || null;
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === 'on';
}

function getKeyResultIds(formData: FormData) {
  return formData
    .getAll('keyResultIds')
    .map((value) => String(value).trim())
    .filter(Boolean);
}

async function requireTaskUser() {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  return user;
}

function revalidateTasks() {
  revalidatePath('/tasks');
  revalidatePath('/okr');
}

async function writeTaskAudit(userId: string, action: string, taskId: string) {
  await db.insert(schema.auditLogs).values({
    actorType: 'user',
    actorId: userId,
    action,
    targetType: 'task',
    targetId: taskId,
  });
}

function normalizeStatus(value: string): TaskStatus {
  if (value === 'today' || value === 'scheduled' || value === 'done' || value === 'canceled') {
    return value;
  }

  return 'inbox';
}

function normalizeTodayType(value: string): TodayType | null {
  return value === 'must' || value === 'focus' ? value : null;
}

export async function createTaskAction(
  prevState: TaskActionState = initialState,
  formData: FormData,
): Promise<TaskActionState> {
  void prevState;
  const user = await requireTaskUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  const title = getTrimmed(formData, 'title');
  if (!title) {
    return { error: 'Title is required' };
  }

  const status = normalizeStatus(getTrimmed(formData, 'status'));
  const todayType = normalizeTodayType(getTrimmed(formData, 'todayType'));
  const scheduledDate = getNullable(formData, 'scheduledDate');

  try {
    const task = await createTask({
      title,
      notes: getNullable(formData, 'notes'),
      status,
      todayType,
      scheduledDate,
      dueDate: getNullable(formData, 'dueDate'),
      important: getBoolean(formData, 'important'),
      urgent: getBoolean(formData, 'urgent'),
      priority: getNullable(formData, 'priority') as 'P1' | 'P2' | 'P3' | null,
      energy: getNullable(formData, 'energy') as 'low' | 'medium' | 'high' | null,
    });

    const keyResultIds = getKeyResultIds(formData);
    if (keyResultIds.length > 0) {
      await replaceTaskKeyResultLinks(task.id, keyResultIds);
    }

    await writeTaskAudit(user.id, 'task.create', task.id);
    revalidateTasks();
    return { error: '' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create task',
    };
  }
}

export async function updateTaskAction(
  prevState: TaskActionState = initialState,
  formData: FormData,
): Promise<TaskActionState> {
  void prevState;
  const user = await requireTaskUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  const taskId = getTrimmed(formData, 'id');
  const title = getTrimmed(formData, 'title');
  if (!taskId || !title) {
    return { error: 'Task id and title are required' };
  }

  try {
    const task = await updateTask(taskId, {
      title,
      notes: getNullable(formData, 'notes'),
      status: normalizeStatus(getTrimmed(formData, 'status')),
      todayType: normalizeTodayType(getTrimmed(formData, 'todayType')),
      scheduledDate: getNullable(formData, 'scheduledDate'),
      dueDate: getNullable(formData, 'dueDate'),
      important: getBoolean(formData, 'important'),
      urgent: getBoolean(formData, 'urgent'),
      priority: getNullable(formData, 'priority') as 'P1' | 'P2' | 'P3' | null,
      energy: getNullable(formData, 'energy') as 'low' | 'medium' | 'high' | null,
    });

    if (!task) {
      return { error: 'Task not found' };
    }

    await replaceTaskKeyResultLinks(taskId, getKeyResultIds(formData));
    await writeTaskAudit(user.id, 'task.update', taskId);
    revalidateTasks();
    return { error: '' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update task',
    };
  }
}

export async function completeTaskAction(taskId: string) {
  const user = await requireTaskUser();
  if (!user) {
    return;
  }

  const task = await completeTask(taskId);
  if (!task) {
    return;
  }

  await writeTaskAudit(user.id, 'task.complete', taskId);
  revalidateTasks();
}

export async function cancelTaskAction(taskId: string) {
  const user = await requireTaskUser();
  if (!user) {
    return;
  }

  const task = await cancelTask(taskId);
  if (!task) {
    return;
  }

  await writeTaskAudit(user.id, 'task.cancel', taskId);
  revalidateTasks();
}

export async function moveTaskToTodayAction(taskId: string, todayType: TodayType) {
  const user = await requireTaskUser();
  if (!user) {
    return;
  }

  const task = await moveTaskToToday(taskId, todayType);
  if (!task) {
    return;
  }

  await writeTaskAudit(user.id, 'task.move_to_today', taskId);
  revalidateTasks();
}

export async function scheduleTaskAction(taskId: string, scheduledDate: string) {
  const user = await requireTaskUser();
  if (!user) {
    return;
  }

  const task = await scheduleTask(taskId, scheduledDate);
  if (!task) {
    return;
  }

  await writeTaskAudit(user.id, 'task.schedule', taskId);
  revalidateTasks();
}
