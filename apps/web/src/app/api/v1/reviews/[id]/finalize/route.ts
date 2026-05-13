import { NextRequest, NextResponse } from 'next/server';
import { conflict, notFound } from '../../../../_lib/validation';
import { finalizeReview, getReview } from '@/lib/services/review-service';
import { recordReviewAudit, requireReviewApiUser, requireReviewId } from '../../_lib';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireReviewApiUser(request);
  if (user instanceof NextResponse) return user;

  const id = await requireReviewId(params);
  if (id instanceof NextResponse) return id;

  try {
    const finalized = await finalizeReview(id);
    if (!finalized) return notFound();

    await recordReviewAudit(user.id, 'review.finalize', id);
    return NextResponse.json((await getReview(id)) ?? finalized);
  } catch (error) {
    return conflict(error instanceof Error ? error.message : 'Unable to finalize review');
  }
}
