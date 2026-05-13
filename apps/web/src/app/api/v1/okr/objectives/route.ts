import { NextRequest, NextResponse } from 'next/server';
import { createObjective, type ObjectiveWriteInput } from '@/lib/services/okr-service';
import { getOkrActivityContext, parseObjectiveInput, requireOkrApiUser } from '../_lib';

export async function POST(request: NextRequest) {
  const user = await requireOkrApiUser(request);
  if (user instanceof NextResponse) return user;
  const input = await parseObjectiveInput(request, 'create');
  if (input instanceof NextResponse) return input;
  try {
    const objective = await createObjective(input as ObjectiveWriteInput, { activityContext: getOkrActivityContext(user) });
    return NextResponse.json(objective, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid objective' }, { status: 400 });
  }
}
