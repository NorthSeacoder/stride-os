import { NextRequest, NextResponse } from 'next/server';
import { createTask, ensureTodayRecurringTasks, listTasksForSource, replaceTaskKeyResultLinks, type TaskWriteInput } from '@/lib/services/task-service';
import { getKeyResultIdsFromBody, getTaskActivityContext, parseTaskSource, parseTaskWriteRequest, requireTaskApiUser } from './_lib';

export async function GET(request: NextRequest) {
  const user = await requireTaskApiUser(request);
  if (user instanceof NextResponse) return user;

  const source = parseTaskSource(request.nextUrl.searchParams.get('source'));
  if (source instanceof NextResponse) return source;

  await ensureTodayRecurringTasks();
  const groups = await listTasksForSource(source);
  return NextResponse.json(groups.flatMap((group) => group.items));
}

export async function POST(request: NextRequest) {
  const user = await requireTaskApiUser(request);
  if (user instanceof NextResponse) return user;

  const body = await request.clone().json().catch(() => ({}));
  const input = await parseTaskWriteRequest(request, 'create');
  if (input instanceof NextResponse) return input;

  try {
    const activityContext = getTaskActivityContext(user);
    const task = await createTask(input as TaskWriteInput, { activityContext });
    const keyResultIds = getKeyResultIdsFromBody(body);
    if (keyResultIds && task?.id) {
      await replaceTaskKeyResultLinks(task.id, keyResultIds, { activityContext });
    }
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid task' }, { status: 400 });
  }
}
