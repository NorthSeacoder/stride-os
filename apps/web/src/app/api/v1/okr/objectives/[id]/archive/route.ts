import { NextRequest, NextResponse } from 'next/server';
import { updateObjective } from '@/lib/services/okr-service';
import { recordOkrAudit, requireId, requireOkrApiUser } from '../../../_lib';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOkrApiUser(request);
  if (user instanceof NextResponse) return user;
  const id = await requireId(params, 'Objective id');
  if (id instanceof NextResponse) return id;
  const objective = await updateObjective(id, { status: 'archived' });
  if (!objective) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await recordOkrAudit(user.id, 'okr.objective.archive', 'okr_objective', id);
  return NextResponse.json(objective);
}
