import { NextRequest, NextResponse } from 'next/server';
import { getCurrentPeriodSummary, listCheckInsInRange } from '@/lib/services/okr-service';
import { listReviews } from '@/lib/services/review-service';
import { listTasksForReviewPeriod } from '@/lib/services/task-service';
import { parseReviewContextRange, requireReviewApiUser } from '../_lib';

export async function GET(request: NextRequest) {
  const user = await requireReviewApiUser(request);
  if (user instanceof NextResponse) return user;

  const range = parseReviewContextRange(request.nextUrl.searchParams);
  if (range instanceof NextResponse) return range;

  const [tasks, currentOkr, checkIns, reviews] = await Promise.all([
    listTasksForReviewPeriod(range.periodStart, range.periodEnd),
    getCurrentPeriodSummary(),
    listCheckInsInRange(range.periodStart, range.periodEnd),
    listReviews(),
  ]);

  return NextResponse.json({
    type: range.type,
    periodStart: range.periodStart,
    periodEnd: range.periodEnd,
    tasks,
    okr: {
      current: currentOkr,
      checkIns,
    },
    reviews: reviews.filter((review: { periodStart: string; periodEnd: string; type: string }) => {
      const sameRange = review.periodStart >= range.periodStart && review.periodEnd <= range.periodEnd;
      return range.type === 'daily' ? sameRange : sameRange && review.type === range.type;
    }),
  });
}
