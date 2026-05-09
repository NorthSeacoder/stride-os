import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/api-auth';
import { listQuadrantTasks } from '@/lib/services/task-service';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const includeCompleted = request.nextUrl.searchParams.get('includeCompleted') === 'true';
  const tasks = await listQuadrantTasks({ includeCompleted });
  return NextResponse.json(tasks);
}
