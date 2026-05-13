import { NextRequest, NextResponse } from 'next/server';
import { notFound } from '../../../../_lib/validation';
import { archiveReview } from '@/lib/services/review-service';
import { recordReviewAudit, requireReviewApiUser, requireReviewId } from '../../_lib';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireReviewApiUser(request);
  if (user instanceof NextResponse) return user;

  const id = await requireReviewId(params);
  if (id instanceof NextResponse) return id;

  const review = await archiveReview(id);
  if (!review) return notFound();

  await recordReviewAudit(user.id, 'review.archive', id);
  return NextResponse.json(review);
}
