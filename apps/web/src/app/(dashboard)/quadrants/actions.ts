'use server';

import { revalidatePath } from 'next/cache';
import { db, schema } from '@stride-os/db';
import { getSessionUser } from '@/lib/auth/session';
import { updateTaskQuadrant } from '@/lib/services/task-service';

async function requireQuadrantUser() {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  return user;
}

export async function updateTaskQuadrantAction(
  taskId: string,
  input: { important: boolean; urgent: boolean },
) {
  const user = await requireQuadrantUser();
  if (!user) {
    return;
  }

  const task = await updateTaskQuadrant(taskId, input);
  if (!task) {
    return;
  }

  await db.insert(schema.auditLogs).values({
    actorType: 'user',
    actorId: user.id,
    action: 'task.quadrant.update',
    targetType: 'task',
    targetId: taskId,
    metadata: input,
  });

  revalidatePath('/quadrants');
  revalidatePath('/dashboard');
  revalidatePath('/tasks');
}
