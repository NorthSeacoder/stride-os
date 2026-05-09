import { NextRequest, NextResponse } from 'next/server';
import { getTrimmedString, parseJsonBody, requireParam } from '../../../../_lib/validation';
import { getAuthUser } from '@/lib/auth/api-auth';
import { db, schema } from '@stride-os/db';
import { createKrCheckIn } from '@/lib/services/okr-service';

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

  const confidence = getTrimmedString(body.confidence);
  if (!confidence) return NextResponse.json({ error: 'Confidence is required' }, { status: 400 });

  const progressRaw = body.progressValue;
  const progressValue = typeof progressRaw === 'number' ? progressRaw : undefined;

  const checkIn = await createKrCheckIn({
    keyResultId: id,
    progressValue,
    confidence: confidence as 'low' | 'medium' | 'high',
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
