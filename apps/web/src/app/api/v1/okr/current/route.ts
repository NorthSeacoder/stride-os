import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/api-auth';
import { getCurrentPeriodSummary } from '@/lib/services/okr-service';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const summary = await getCurrentPeriodSummary();
  return NextResponse.json(summary);
}
