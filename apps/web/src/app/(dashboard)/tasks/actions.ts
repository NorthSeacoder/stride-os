'use server';

import { revalidatePath } from 'next/cache';
import { db, schema } from '@stride-os/db';
import { getSessionUser } from '@/lib/auth/session';
import {
  createTaskDefinition,
  createTaskList,
  createTask,
  ensureRecurringTasksForDate,
  replaceTaskDefinitionKeyResultLinks,
  toggleTaskCompletion,
  updateTask,
  updateTaskDefinition,
  replaceTaskKeyResultLinks,
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
  revalidatePath('/dashboard');
  revalidatePath('/review');
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

async function writeTaskListAudit(userId: string, action: string, listId: string) {
  await db.insert(schema.auditLogs).values({
    actorType: 'user',
    actorId: userId,
    action,
    targetType: 'task_list',
    targetId: listId,
  });
}

async function writeTaskDefinitionAudit(userId: string, action: string, definitionId: string) {
  await db.insert(schema.auditLogs).values({
    actorType: 'user',
    actorId: userId,
    action,
    targetType: 'task_definition',
    targetId: definitionId,
  });
}

export async function createTaskAction(
  prevState: TaskActionState = initialState,
  formData: FormData,
): Promise<TaskActionState> {
  void prevState;
  const user = await requireTaskUser();
  if (!user) {
    return { error: '未授权' };
  }

  const title = getTrimmed(formData, 'title');
  if (!title) {
    return { error: '标题不能为空' };
  }

  try {
    const task = await createTask({
      title,
      description: getNullable(formData, 'description'),
      notes: getNullable(formData, 'description'),
      listId: getNullable(formData, 'listId'),
      dueDate: getNullable(formData, 'dueDate'),
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
      error: error instanceof Error ? error.message : '创建任务失败',
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
    return { error: '未授权' };
  }

  const taskId = getTrimmed(formData, 'taskId') || getTrimmed(formData, 'id');
  const title = getTrimmed(formData, 'title');
  if (!taskId || !title) {
    return { error: '任务 ID 和标题不能为空' };
  }

  try {
    const task = await updateTask(taskId, {
      title,
      description: getNullable(formData, 'description'),
      notes: getNullable(formData, 'description'),
      listId: getNullable(formData, 'listId'),
      dueDate: getNullable(formData, 'dueDate'),
    });

    if (!task) {
      return { error: '未找到任务' };
    }

    await replaceTaskKeyResultLinks(taskId, getKeyResultIds(formData));
    await writeTaskAudit(user.id, 'task.update', taskId);
    revalidateTasks();
    return { error: '' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '更新任务失败',
    };
  }
}

export async function createTaskListAction(
  prevState: TaskActionState = initialState,
  formData: FormData,
): Promise<TaskActionState> {
  void prevState;
  const user = await requireTaskUser();
  if (!user) {
    return { error: '未授权' };
  }

  const name = getTrimmed(formData, 'name');
  if (!name) {
    return { error: '清单名称不能为空' };
  }

  try {
    const list = await createTaskList({
      name,
      icon: getNullable(formData, 'icon'),
    });

    await writeTaskListAudit(user.id, 'task.list.create', list.id);
    revalidateTasks();
    return { error: '' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '创建清单失败',
    };
  }
}

export async function createTaskDefinitionAction(
  prevState: TaskActionState = initialState,
  formData: FormData,
): Promise<TaskActionState> {
  void prevState;
  const user = await requireTaskUser();
  if (!user) {
    return { error: '未授权' };
  }

  const title = getTrimmed(formData, 'title');
  const listId = getTrimmed(formData, 'listId');
  if (!title || !listId) {
    return { error: '标题和清单不能为空' };
  }

  try {
    const definition = await createTaskDefinition({
      title,
      description: getNullable(formData, 'description'),
      listId,
      frequency: getTrimmed(formData, 'frequency') as 'daily' | 'weekly' | 'monthly' | 'weekdays' | 'weekends',
      endType: getTrimmed(formData, 'endType') as 'never' | 'until_date' | 'after_count',
      endDate: getNullable(formData, 'endDate'),
      occurrenceCount: getNullable(formData, 'occurrenceCount') ? Number(getNullable(formData, 'occurrenceCount')) : null,
    });

    await replaceTaskDefinitionKeyResultLinks(definition.id, getKeyResultIds(formData));
    await ensureRecurringTasksForDate(getNullable(formData, 'targetDate') ?? undefined);
    await writeTaskDefinitionAudit(user.id, 'task.definition.create', definition.id);
    revalidateTasks();
    return { error: '' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '创建重复任务失败',
    };
  }
}

export async function updateTaskDefinitionAction(
  prevState: TaskActionState = initialState,
  formData: FormData,
): Promise<TaskActionState> {
  void prevState;
  const user = await requireTaskUser();
  if (!user) {
    return { error: '未授权' };
  }

  const definitionId = getTrimmed(formData, 'definitionId') || getTrimmed(formData, 'id');
  if (!definitionId) {
    return { error: '重复定义 ID 不能为空' };
  }

  try {
    const definition = await updateTaskDefinition(definitionId, {
      title: getTrimmed(formData, 'title') || undefined,
      description: getNullable(formData, 'description'),
      listId: getTrimmed(formData, 'listId') || undefined,
      frequency: (getTrimmed(formData, 'frequency') || undefined) as 'daily' | 'weekly' | 'monthly' | 'weekdays' | 'weekends' | undefined,
      endType: (getTrimmed(formData, 'endType') || undefined) as 'never' | 'until_date' | 'after_count' | undefined,
      endDate: getNullable(formData, 'endDate'),
      occurrenceCount: getNullable(formData, 'occurrenceCount') ? Number(getNullable(formData, 'occurrenceCount')) : undefined,
    });

    if (!definition) {
      return { error: '未找到重复定义' };
    }

    await replaceTaskDefinitionKeyResultLinks(definitionId, getKeyResultIds(formData));
    await ensureRecurringTasksForDate(getNullable(formData, 'targetDate') ?? undefined);
    await writeTaskDefinitionAudit(user.id, 'task.definition.update', definitionId);
    revalidateTasks();
    return { error: '' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '更新重复任务失败',
    };
  }
}

export async function toggleTaskCompletionAction(taskId: string, completed: boolean) {
  const user = await requireTaskUser();
  if (!user) {
    return;
  }

  const task = await toggleTaskCompletion(taskId, completed);
  if (!task) {
    return;
  }

  await writeTaskAudit(user.id, completed ? 'task.complete' : 'task.reopen', taskId);
  revalidateTasks();
}
