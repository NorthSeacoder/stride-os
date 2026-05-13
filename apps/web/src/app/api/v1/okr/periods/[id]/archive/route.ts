import { NextRequest, NextResponse } from 'next/server';
import { archivePeriod } from '@/lib/services/okr-service';
import { recordOkrAudit, requireId, requireOkrApiUser } from '../../../_lib';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOkrApiUser(request);
  if (user instanceof NextResponse) return user;
  const id = await requireId(params, 'Period id');
  if (id instanceof NextResponse) return id;
  const period = await archivePeriod(id);
  if (!period) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await recordOkrAudit(user.id, 'okr.period.archive', 'okr_period', id);
  return NextResponse.json(period);
}
