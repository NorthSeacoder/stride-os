import { NextRequest, NextResponse } from 'next/server';
import { completeTask } from '@/lib/services/task-service';
import { getTaskActivityContext, requireTaskApiUser, requireTaskId } from '../../_lib';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireTaskApiUser(request);
  if (user instanceof NextResponse) return user;

  const taskId = await requireTaskId(params);
  if (taskId instanceof NextResponse) return taskId;

  const task = await completeTask(taskId, { activityContext: getTaskActivityContext(user) });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(task);
}
