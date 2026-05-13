import { NextRequest, NextResponse } from 'next/server';
import { archiveTask } from '@/lib/services/task-service';
import { recordTaskAudit, requireTaskApiUser, requireTaskId } from '../../_lib';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireTaskApiUser(request);
  if (user instanceof NextResponse) return user;

  const taskId = await requireTaskId(params);
  if (taskId instanceof NextResponse) return taskId;

  const task = await archiveTask(taskId);
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await recordTaskAudit(user.id, 'task.archive', taskId);
  return NextResponse.json(task);
}
