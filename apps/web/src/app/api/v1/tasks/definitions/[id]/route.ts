import { NextRequest, NextResponse } from 'next/server';
import {
  ensureRecurringTasksForDate,
  getTaskDefinitionDetail,
  replaceTaskDefinitionKeyResultLinks,
  updateTaskDefinition,
} from '@/lib/services/task-service';
import {
  getTaskDefinitionKeyResultLinksFromBody,
  parseTaskDefinitionWriteRequest,
  requireTaskApiUser,
  requireTaskId,
} from '../../_lib';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireTaskApiUser(request);
  if (user instanceof NextResponse) return user;

  const definitionId = await requireTaskId(params);
  if (definitionId instanceof NextResponse) return definitionId;

  const definition = await getTaskDefinitionDetail(definitionId);
  if (!definition) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(definition);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireTaskApiUser(request);
  if (user instanceof NextResponse) return user;

  const definitionId = await requireTaskId(params);
  if (definitionId instanceof NextResponse) return definitionId;

  const body = await request.clone().json().catch(() => ({}));
  const input = await parseTaskDefinitionWriteRequest(request, 'update');
  if (input instanceof NextResponse) return input;

  try {
    const definition = await updateTaskDefinition(definitionId, input);
    if (!definition) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const keyResultLinks = getTaskDefinitionKeyResultLinksFromBody(body);
    if (keyResultLinks instanceof NextResponse) return keyResultLinks;
    if (keyResultLinks) {
      await replaceTaskDefinitionKeyResultLinks(definitionId, keyResultLinks);
    }

    const targetDate = typeof body.targetDate === 'string' && body.targetDate.trim() ? body.targetDate.trim() : undefined;
    await ensureRecurringTasksForDate(targetDate);

    return NextResponse.json(await getTaskDefinitionDetail(definitionId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid task definition' },
      { status: 400 },
    );
  }
}
