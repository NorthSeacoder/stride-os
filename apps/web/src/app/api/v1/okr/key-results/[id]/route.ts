import { NextRequest, NextResponse } from 'next/server';
import { getKeyResultDetail, updateKeyResult } from '@/lib/services/okr-service';
import { parseKeyResultInput, recordOkrAudit, requireId, requireOkrApiUser } from '../../_lib';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOkrApiUser(request);
  if (user instanceof NextResponse) return user;
  const id = await requireId(params, 'Key result id');
  if (id instanceof NextResponse) return id;
  const keyResult = await getKeyResultDetail(id);
  if (!keyResult) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(keyResult);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOkrApiUser(request);
  if (user instanceof NextResponse) return user;
  const id = await requireId(params, 'Key result id');
  if (id instanceof NextResponse) return id;
  const input = await parseKeyResultInput(request, 'update');
  if (input instanceof NextResponse) return input;
  try {
    const keyResult = await updateKeyResult(id, input);
    if (!keyResult) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await recordOkrAudit(user.id, 'okr.key_result.update', 'okr_key_result', id);
    return NextResponse.json(keyResult);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid key result' }, { status: 400 });
  }
}
