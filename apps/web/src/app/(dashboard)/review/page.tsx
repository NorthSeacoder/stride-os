import { getReviewDraftOrGenerate, listReviews } from '@/lib/services/review-service';
import { ReviewClient } from './review-client';

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = (day + 6) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - mondayOffset);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
}

export default async function ReviewPage() {
  const week = getWeekRange();
  const [draftOrReview, reviews] = await Promise.all([
    getReviewDraftOrGenerate(week.periodStart, week.periodEnd),
    listReviews(),
  ]);

  const initialDraft = 'id' in draftOrReview
    ? {
        type: 'weekly' as const,
        periodStart: draftOrReview.periodStart,
        periodEnd: draftOrReview.periodEnd,
        title: draftOrReview.title,
        body: draftOrReview.body,
        structuredSummary: (draftOrReview.structuredSummary ?? {}) as Record<string, unknown>,
        keyResultIds: draftOrReview.krSnapshots.map((snapshot: { keyResultId: string }) => snapshot.keyResultId),
      }
    : draftOrReview;

  const latestDraftId = 'id' in draftOrReview ? draftOrReview.id : null;

  return (
    <ReviewClient
      initialDraft={initialDraft}
      latestDraftId={latestDraftId}
      reviews={reviews.map((review: { id: string; title: string; status: string; periodStart: string; periodEnd: string; updatedAt: Date }) => ({
        id: review.id,
        title: review.title,
        status: review.status,
        periodStart: review.periodStart,
        periodEnd: review.periodEnd,
        updatedAt: review.updatedAt,
      }))}
    />
  );
}
