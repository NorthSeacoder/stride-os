import { NextRequest, NextResponse } from 'next/server';
import { updateKeyResult } from '@/lib/services/okr-service';
import { getOkrActivityContext, requireId, requireOkrApiUser } from '../../../_lib';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOkrApiUser(request);
  if (user instanceof NextResponse) return user;
  const id = await requireId(params, 'Key result id');
  if (id instanceof NextResponse) return id;
  const keyResult = await updateKeyResult(id, { status: 'archived' }, { activityContext: getOkrActivityContext(user) });
  if (!keyResult) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(keyResult);
}
