import { NextRequest, NextResponse } from 'next/server';
import { notFound } from '../../../_lib/validation';
import { parseReviewPatchRequest, recordReviewAudit, requireReviewApiUser, requireReviewId } from '../_lib';
import { finalizeReview, getReview, updateReviewDraftById } from '@/lib/services/review-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireReviewApiUser(request);
  if (user instanceof NextResponse) return user;

  const id = await requireReviewId(params);
  if (id instanceof NextResponse) return id;

  const review = await getReview(id);
  if (!review) return notFound();

  return NextResponse.json(review);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireReviewApiUser(request);
  if (user instanceof NextResponse) return user;

  const id = await requireReviewId(params);
  if (id instanceof NextResponse) return id;

  const review = await getReview(id);
  if (!review) return notFound();

  const body = await parseReviewPatchRequest(request);
  if (body instanceof NextResponse) return body;
  let updated = review;

  if (body.status === 'final') {
    const finalized = await finalizeReview(id);
    if (!finalized) return notFound();
    updated = (await getReview(id)) ?? finalized;
  } else {
    const changed = await updateReviewDraftById(id, {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.body !== undefined ? { body: body.body } : {}),
      ...(body.structuredSummary !== undefined ? { structuredSummary: body.structuredSummary } : {}),
    });

    if (!changed) return notFound();
    updated = (await getReview(id)) ?? changed;
  }

  await recordReviewAudit(user.id, body.status === 'final' ? 'review.finalize' : 'review.update', id);

  return NextResponse.json(updated);
}
