import { NextRequest, NextResponse } from 'next/server';
import { getTrimmedString, parseJsonBody } from '../../_lib/validation';
import { getAuthUser } from '@/lib/auth/api-auth';
import { db, schema } from '@stride-os/db';
import { listReviews, saveReviewDraft } from '@/lib/services/review-service';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reviews = await listReviews();
  return NextResponse.json(reviews);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) return body;

  const type = getTrimmedString(body.type);
  const periodStart = getTrimmedString(body.periodStart);
  const periodEnd = getTrimmedString(body.periodEnd);
  const title = getTrimmedString(body.title);
  const bodyText = getTrimmedString(body.body);
  const structuredSummary = body.structuredSummary && typeof body.structuredSummary === 'object'
    ? body.structuredSummary as Record<string, unknown>
    : {};
  const keyResultIds = Array.isArray(body.keyResultIds)
    ? body.keyResultIds.map((value: unknown) => String(value).trim()).filter(Boolean)
    : [];

  if (!type || !periodStart || !periodEnd || !title || !bodyText) {
    return NextResponse.json({ error: 'type, periodStart, periodEnd, title, and body are required' }, { status: 400 });
  }

  const review = await saveReviewDraft({
    type: type as 'weekly' | 'monthly' | 'period',
    periodStart,
    periodEnd,
    title,
    body: bodyText,
    structuredSummary,
    keyResultIds,
  });

  await db.insert(schema.auditLogs).values({
    actorType: 'user',
    actorId: user.id,
    action: 'review.draft.save',
    targetType: 'review',
    targetId: review?.id,
  });

  return NextResponse.json(review, { status: 201 });
}
