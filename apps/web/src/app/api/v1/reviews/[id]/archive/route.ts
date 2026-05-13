import { NextRequest, NextResponse } from 'next/server';
import { notFound } from '../../../../_lib/validation';
import { archiveReview } from '@/lib/services/review-service';
import { getReviewActivityContext, requireReviewApiUser, requireReviewId } from '../../_lib';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireReviewApiUser(request);
  if (user instanceof NextResponse) return user;

  const id = await requireReviewId(params);
  if (id instanceof NextResponse) return id;

  const review = await archiveReview(id, { activityContext: getReviewActivityContext(user) });
  if (!review) return notFound();
  return NextResponse.json(review);
}
