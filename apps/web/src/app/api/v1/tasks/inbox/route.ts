import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/api-auth';
import { ensureTodayRecurringTasks, listTasksForSource } from '@/lib/services/task-service';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureTodayRecurringTasks();
  const groups = await listTasksForSource('inbox');
  const tasks = groups.flatMap((group) => group.items);
  return NextResponse.json(tasks);
}
