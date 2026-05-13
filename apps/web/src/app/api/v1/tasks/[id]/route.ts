import { NextRequest, NextResponse } from 'next/server';
import { getKeyResultIdsFromBody, getTaskActivityContext, parseTaskWriteRequest, requireTaskApiUser, requireTaskId } from '../_lib';
import { getTaskDetail, replaceTaskKeyResultLinks, updateTask } from '@/lib/services/task-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireTaskApiUser(request);
  if (user instanceof NextResponse) return user;

  const taskId = await requireTaskId(params);
  if (taskId instanceof NextResponse) return taskId;

  const task = await getTaskDetail(taskId);
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireTaskApiUser(request);
  if (user instanceof NextResponse) return user;

  const taskId = await requireTaskId(params);
  if (taskId instanceof NextResponse) return taskId;

  const body = await request.clone().json().catch(() => ({}));
  const input = await parseTaskWriteRequest(request, 'update');
  if (input instanceof NextResponse) return input;

  try {
    const activityContext = getTaskActivityContext(user);
    const task = await updateTask(taskId, input, { activityContext });
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const keyResultIds = getKeyResultIdsFromBody(body);
    if (keyResultIds) await replaceTaskKeyResultLinks(taskId, keyResultIds, { activityContext });
    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid task' }, { status: 400 });
  }
}
