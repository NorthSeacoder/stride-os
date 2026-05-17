import { NextRequest, NextResponse } from 'next/server';
import {
  createTaskDefinition,
  ensureRecurringTasksForDate,
  getTaskDefinitionDetail,
  listTaskDefinitions,
  replaceTaskDefinitionKeyResultLinks,
  type TaskDefinitionWriteInput,
} from '@/lib/services/task-service';
import {
  getTaskDefinitionKeyResultLinksFromBody,
  parseTaskDefinitionWriteRequest,
  requireTaskApiUser,
} from '../_lib';

export async function GET(request: NextRequest) {
  const user = await requireTaskApiUser(request);
  if (user instanceof NextResponse) return user;

  return NextResponse.json(await listTaskDefinitions());
}

export async function POST(request: NextRequest) {
  const user = await requireTaskApiUser(request);
  if (user instanceof NextResponse) return user;

  const body = await request.clone().json().catch(() => ({}));
  const input = await parseTaskDefinitionWriteRequest(request, 'create');
  if (input instanceof NextResponse) return input;

  try {
    const definition = await createTaskDefinition(input as TaskDefinitionWriteInput);
    const keyResultLinks = getTaskDefinitionKeyResultLinksFromBody(body);
    if (keyResultLinks instanceof NextResponse) return keyResultLinks;
    if (keyResultLinks) {
      await replaceTaskDefinitionKeyResultLinks(definition.id, keyResultLinks);
    }

    const targetDate = typeof body.targetDate === 'string' && body.targetDate.trim() ? body.targetDate.trim() : undefined;
    await ensureRecurringTasksForDate(targetDate);
    const detail = await getTaskDefinitionDetail(definition.id);
    return NextResponse.json(detail ?? definition, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid task definition' },
      { status: 400 },
    );
  }
}
