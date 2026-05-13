import { NextRequest, NextResponse } from 'next/server';
import { createKeyResult, type KeyResultWriteInput } from '@/lib/services/okr-service';
import { parseKeyResultInput, recordOkrAudit, requireOkrApiUser } from '../_lib';

export async function POST(request: NextRequest) {
  const user = await requireOkrApiUser(request);
  if (user instanceof NextResponse) return user;
  const input = await parseKeyResultInput(request, 'create');
  if (input instanceof NextResponse) return input;
  try {
    const keyResult = await createKeyResult(input as KeyResultWriteInput);
    await recordOkrAudit(user.id, 'okr.key_result.create', 'okr_key_result', keyResult?.id ?? null);
    return NextResponse.json(keyResult, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid key result' }, { status: 400 });
  }
}
