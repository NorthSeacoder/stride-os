import { NextRequest, NextResponse } from 'next/server';
import { getPeriod, updatePeriod } from '@/lib/services/okr-service';
import { parsePeriodInput, recordOkrAudit, requireId, requireOkrApiUser } from '../../_lib';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOkrApiUser(request);
  if (user instanceof NextResponse) return user;
  const id = await requireId(params, 'Period id');
  if (id instanceof NextResponse) return id;
  const period = await getPeriod(id);
  if (!period) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(period);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOkrApiUser(request);
  if (user instanceof NextResponse) return user;
  const id = await requireId(params, 'Period id');
  if (id instanceof NextResponse) return id;
  const input = await parsePeriodInput(request, 'update');
  if (input instanceof NextResponse) return input;
  try {
    const period = await updatePeriod(id, input);
    if (!period) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await recordOkrAudit(user.id, 'okr.period.update', 'okr_period', id);
    return NextResponse.json(period);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid period' }, { status: 400 });
  }
}
