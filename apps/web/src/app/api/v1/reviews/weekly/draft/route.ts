import { NextRequest, NextResponse } from 'next/server';
import { getTrimmedString, parseJsonBody } from '../../../../_lib/validation';
import { getAuthUser } from '@/lib/auth/api-auth';
import { buildWeeklyReviewDraft } from '@/lib/services/review-service';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) return body;

  const periodStart = getTrimmedString(body.periodStart);
  const periodEnd = getTrimmedString(body.periodEnd);
  if (!periodStart || !periodEnd) {
    return NextResponse.json({ error: 'periodStart and periodEnd are required' }, { status: 400 });
  }

  const draft = await buildWeeklyReviewDraft(periodStart, periodEnd);
  return NextResponse.json(draft);
}
