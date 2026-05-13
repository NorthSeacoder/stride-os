import { NextRequest, NextResponse } from 'next/server';
import { updateKeyResult } from '@/lib/services/okr-service';
import { recordOkrAudit, requireId, requireOkrApiUser } from '../../../_lib';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOkrApiUser(request);
  if (user instanceof NextResponse) return user;
  const id = await requireId(params, 'Key result id');
  if (id instanceof NextResponse) return id;
  const keyResult = await updateKeyResult(id, { status: 'archived' });
  if (!keyResult) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await recordOkrAudit(user.id, 'okr.key_result.archive', 'okr_key_result', id);
  return NextResponse.json(keyResult);
}
