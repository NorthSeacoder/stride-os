import { NextRequest, NextResponse } from 'next/server';
import { createPeriod, listPeriods, type PeriodWriteInput } from '@/lib/services/okr-service';
import { parsePeriodInput, recordOkrAudit, requireOkrApiUser } from '../_lib';

export async function GET(request: NextRequest) {
  const user = await requireOkrApiUser(request);
  if (user instanceof NextResponse) return user;
  return NextResponse.json(await listPeriods());
}

export async function POST(request: NextRequest) {
  const user = await requireOkrApiUser(request);
  if (user instanceof NextResponse) return user;
  const input = await parsePeriodInput(request, 'create');
  if (input instanceof NextResponse) return input;
  try {
    const period = await createPeriod(input as PeriodWriteInput);
    await recordOkrAudit(user.id, 'okr.period.create', 'okr_period', period?.id ?? null);
    return NextResponse.json(period, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid period' }, { status: 400 });
  }
}
