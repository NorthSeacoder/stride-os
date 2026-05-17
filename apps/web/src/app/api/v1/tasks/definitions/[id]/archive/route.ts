import { NextRequest, NextResponse } from 'next/server';
import { archiveTaskDefinition } from '@/lib/services/task-service';
import { requireTaskApiUser, requireTaskId } from '../../../_lib';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireTaskApiUser(request);
  if (user instanceof NextResponse) return user;

  const definitionId = await requireTaskId(params);
  if (definitionId instanceof NextResponse) return definitionId;

  const definition = await archiveTaskDefinition(definitionId);
  if (!definition) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(definition);
}
