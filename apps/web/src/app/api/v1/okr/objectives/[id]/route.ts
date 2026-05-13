import { NextRequest, NextResponse } from 'next/server';
import { getObjective, updateObjective } from '@/lib/services/okr-service';
import { getOkrActivityContext, parseObjectiveInput, requireId, requireOkrApiUser } from '../../_lib';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOkrApiUser(request);
  if (user instanceof NextResponse) return user;
  const id = await requireId(params, 'Objective id');
  if (id instanceof NextResponse) return id;
  const objective = await getObjective(id);
  if (!objective) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(objective);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOkrApiUser(request);
  if (user instanceof NextResponse) return user;
  const id = await requireId(params, 'Objective id');
  if (id instanceof NextResponse) return id;
  const input = await parseObjectiveInput(request, 'update');
  if (input instanceof NextResponse) return input;
  try {
    const objective = await updateObjective(id, input, { activityContext: getOkrActivityContext(user) });
    if (!objective) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(objective);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid objective' }, { status: 400 });
  }
}
