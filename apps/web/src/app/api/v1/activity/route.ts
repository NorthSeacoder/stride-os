import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/api-auth';
import { badRequest } from '../../_lib/validation';
import { listActivity } from '@/lib/services/activity-service';

function parseDateParam(value: string | null, label: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return badRequest(`${label} is invalid`);
  }

  return parsed;
}

function parseLimit(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return badRequest('limit is invalid');
  }

  return parsed;
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const start = parseDateParam(params.get('start'), 'start');
  if (start instanceof NextResponse) return start;
  const end = parseDateParam(params.get('end'), 'end');
  if (end instanceof NextResponse) return end;
  const limit = parseLimit(params.get('limit'));
  if (limit instanceof NextResponse) return limit;

  const result = await listActivity({
    start,
    end,
    targetType: params.get('targetType')?.trim() || undefined,
    targetId: params.get('targetId')?.trim() || undefined,
    actorType: params.get('actorType')?.trim() || undefined,
    actorId: params.get('actorId')?.trim() || undefined,
    source: params.get('source')?.trim() || undefined,
    action: params.get('action')?.trim() || undefined,
    keyword: params.get('keyword')?.trim() || undefined,
    changedField: params.get('changedField')?.trim() || undefined,
    cursor: params.get('cursor')?.trim() || undefined,
    limit,
  });

  return NextResponse.json(result);
}
