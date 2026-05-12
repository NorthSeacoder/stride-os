'use server';

import { revalidatePath } from 'next/cache';
import { db, schema } from '@stride-os/db';
import { getSessionUser } from '@/lib/auth/session';
import {
  moveTaskToQuadrant,
  moveTaskToQuadrantList,
  toggleTaskCompletion,
  type TaskQuadrantKey,
} from '@/lib/services/task-service';

async function requireQuadrantUser() {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  return user;
}

export async function moveTaskToQuadrantAction(taskId: string, quadrant: TaskQuadrantKey) {
  const user = await requireQuadrantUser();
  if (!user) {
    return { error: '未授权' };
  }

  const task = await moveTaskToQuadrant(taskId, quadrant);
  if (!task) {
    return { error: '未找到任务' };
  }

  await db.insert(schema.auditLogs).values({
    actorType: 'user',
    actorId: user.id,
    action: 'task.quadrant.move',
    targetType: 'task',
    targetId: taskId,
    metadata: { quadrant },
  });

  revalidatePath('/quadrants');
  revalidatePath('/dashboard');
  revalidatePath('/tasks');
  return { error: '' };
}

export async function moveTaskToQuadrantListAction(taskId: string, listId: string | null) {
  const user = await requireQuadrantUser();
  if (!user) {
    return { error: '未授权' };
  }

  const task = await moveTaskToQuadrantList(taskId, listId);
  if (!task) {
    return { error: '未找到任务' };
  }

  await db.insert(schema.auditLogs).values({
    actorType: 'user',
    actorId: user.id,
    action: 'task.quadrant.move-list',
    targetType: 'task',
    targetId: taskId,
    metadata: { listId },
  });

  revalidatePath('/quadrants');
  revalidatePath('/dashboard');
  revalidatePath('/tasks');
  return { error: '' };
}

export async function toggleQuadrantTaskCompletionAction(taskId: string, completed: boolean) {
  const user = await requireQuadrantUser();
  if (!user) {
    return { error: '未授权' };
  }

  const task = await toggleTaskCompletion(taskId, completed);
  if (!task) {
    return { error: '未找到任务' };
  }

  await db.insert(schema.auditLogs).values({
    actorType: 'user',
    actorId: user.id,
    action: completed ? 'task.complete' : 'task.reopen',
    targetType: 'task',
    targetId: taskId,
    metadata: { completed },
  });

  revalidatePath('/quadrants');
  revalidatePath('/dashboard');
  revalidatePath('/tasks');
  return { error: '' };
}
