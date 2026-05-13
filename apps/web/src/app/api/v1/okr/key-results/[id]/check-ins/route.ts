import { NextRequest, NextResponse } from 'next/server';
import { createKrCheckIn, listKeyResultCheckIns } from '@/lib/services/okr-service';
import { parseCheckInInput, recordOkrAudit, requireId, requireOkrApiUser } from '../../../_lib';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOkrApiUser(request);
  if (user instanceof NextResponse) return user;
  const id = await requireId(params, 'Key result id');
  if (id instanceof NextResponse) return id;
  return NextResponse.json(await listKeyResultCheckIns(id));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOkrApiUser(request);
  if (user instanceof NextResponse) return user;
  const id = await requireId(params, 'Key result id');
  if (id instanceof NextResponse) return id;
  const input = await parseCheckInInput(request, id);
  if (input instanceof NextResponse) return input;
  try {
    const checkIn = await createKrCheckIn(input);
    await recordOkrAudit(user.id, 'okr.check_in.create', 'kr_check_in', checkIn?.id ?? null);
    return NextResponse.json(checkIn, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid check-in' }, { status: 400 });
  }
}
