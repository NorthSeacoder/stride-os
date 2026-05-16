import { NextRequest, NextResponse } from 'next/server';
import { getTrimmedString, parseJsonBody, requireParam } from '../../../../_lib/validation';
import { getAuthUser } from '@/lib/auth/api-auth';
import { db, schema } from '@stride-os/db';
import { createKrCheckIn, listKeyResultCheckIns } from '@/lib/services/okr-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const paramError = requireParam(id.trim(), 'Key result id');
  if (paramError) return paramError;

  return NextResponse.json(await listKeyResultCheckIns(id));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const paramError = requireParam(id.trim(), 'Key result id');
  if (paramError) return paramError;

  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) return body;

  const checkIn = await createKrCheckIn({
    keyResultId: id,
    summary: getTrimmedString(body.summary) || undefined,
    blockers: getTrimmedString(body.blockers) || undefined,
    nextActions: getTrimmedString(body.nextActions) || undefined,
  });

  await db.insert(schema.auditLogs).values({
    actorType: 'user',
    actorId: user.id,
    action: 'okr.check_in.create',
    targetType: 'kr_check_in',
    targetId: checkIn.id,
  });

  return NextResponse.json(checkIn, { status: 201 });
}
