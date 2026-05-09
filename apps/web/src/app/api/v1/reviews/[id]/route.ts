import { NextRequest, NextResponse } from 'next/server';
import { getTrimmedString, parseJsonBody, requireParam } from '../../../_lib/validation';
import { getAuthUser } from '@/lib/auth/api-auth';
import { db, schema } from '@stride-os/db';
import { finalizeReview, getReview, updateReviewDraftById } from '@/lib/services/review-service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const paramError = requireParam(id.trim(), 'Review id');
  if (paramError) return paramError;

  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) return body;

  const review = await getReview(id);
  if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const status = body.status === undefined ? undefined : getTrimmedString(body.status);
  let updated = review;

  if (status === 'final') {
    const finalized = await finalizeReview(id);
    if (!finalized) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    updated = (await getReview(id)) ?? finalized;
  } else {
    const title = body.title === undefined ? undefined : getTrimmedString(body.title);
    const bodyText = body.body === undefined ? undefined : getTrimmedString(body.body);
    const structuredSummary = body.structuredSummary && typeof body.structuredSummary === 'object'
      ? body.structuredSummary as Record<string, unknown>
      : undefined;

    if (title !== undefined && !title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (bodyText !== undefined && !bodyText) {
      return NextResponse.json({ error: 'Body is required' }, { status: 400 });
    }

    const changed = await updateReviewDraftById(id, {
      ...(title !== undefined ? { title } : {}),
      ...(bodyText !== undefined ? { body: bodyText } : {}),
      ...(structuredSummary !== undefined ? { structuredSummary } : {}),
    });

    if (!changed) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    updated = (await getReview(id)) ?? changed;
  }

  await db.insert(schema.auditLogs).values({
    actorType: 'user',
    actorId: user.id,
    action: status === 'final' ? 'review.finalize' : 'review.update',
    targetType: 'review',
    targetId: id,
  });

  return NextResponse.json(updated);
}
