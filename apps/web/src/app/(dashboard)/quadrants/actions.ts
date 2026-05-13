'use server';

import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/auth/session';
import { buildWebActivityContext } from '@/lib/services/activity-service';
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

  return {
    ...user,
    activityContext: buildWebActivityContext({
      userId: user.id,
      actorLabel: 'You',
    }),
  };
}

export async function moveTaskToQuadrantAction(taskId: string, quadrant: TaskQuadrantKey) {
  const user = await requireQuadrantUser();
  if (!user) {
    return { error: '未授权' };
  }

  const task = await moveTaskToQuadrant(taskId, quadrant, undefined, { activityContext: user.activityContext });
  if (!task) {
    return { error: '未找到任务' };
  }

  revalidatePath('/quadrants');
  revalidatePath('/dashboard');
  revalidatePath('/tasks');
  revalidatePath('/activity');
  return { error: '' };
}

export async function moveTaskToQuadrantListAction(taskId: string, listId: string | null) {
  const user = await requireQuadrantUser();
  if (!user) {
    return { error: '未授权' };
  }

  const task = await moveTaskToQuadrantList(taskId, listId, { activityContext: user.activityContext });
  if (!task) {
    return { error: '未找到任务' };
  }

  revalidatePath('/quadrants');
  revalidatePath('/dashboard');
  revalidatePath('/tasks');
  revalidatePath('/activity');
  return { error: '' };
}

export async function toggleQuadrantTaskCompletionAction(taskId: string, completed: boolean) {
  const user = await requireQuadrantUser();
  if (!user) {
    return { error: '未授权' };
  }

  const task = await toggleTaskCompletion(taskId, completed, { activityContext: user.activityContext });
  if (!task) {
    return { error: '未找到任务' };
  }

  revalidatePath('/quadrants');
  revalidatePath('/dashboard');
  revalidatePath('/tasks');
  revalidatePath('/activity');
  return { error: '' };
}
