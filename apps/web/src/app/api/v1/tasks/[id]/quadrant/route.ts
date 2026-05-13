import { NextRequest, NextResponse } from 'next/server';
import { moveTaskToQuadrant } from '@/lib/services/task-service';
import { getTaskActivityContext, parseQuadrant, requireTaskApiUser, requireTaskId } from '../../_lib';
import { parseJsonBody } from '@/app/api/_lib/validation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireTaskApiUser(request);
  if (user instanceof NextResponse) return user;

  const taskId = await requireTaskId(params);
  if (taskId instanceof NextResponse) return taskId;

  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) return body;

  const quadrant = parseQuadrant(body.quadrant);
  if (quadrant instanceof NextResponse) return quadrant;

  const today = typeof body.today === 'string' ? body.today : undefined;
  const task = await moveTaskToQuadrant(taskId, quadrant, today, { activityContext: getTaskActivityContext(user) });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(task);
}
