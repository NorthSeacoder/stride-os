import { NextRequest, NextResponse } from 'next/server';
import { updateTask } from '@/lib/services/task-service';
import { recordTaskAudit, requireTaskApiUser, requireTaskId } from '../../_lib';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireTaskApiUser(request);
  if (user instanceof NextResponse) return user;

  const taskId = await requireTaskId(params);
  if (taskId instanceof NextResponse) return taskId;

  const task = await updateTask(taskId, { completedAt: null });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await recordTaskAudit(user.id, 'task.restore', taskId);
  return NextResponse.json(task);
}
