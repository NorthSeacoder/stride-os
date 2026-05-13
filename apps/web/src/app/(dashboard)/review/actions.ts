'use server';

import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/auth/session';
import { buildWebActivityContext } from '@/lib/services/activity-service';
import {
  buildWeeklyReviewDraft,
  finalizeReview,
  saveReviewDraft,
  type ReviewDraftPayload,
} from '@/lib/services/review-service';

type WeeklyReviewDraftPayload = ReviewDraftPayload & {
  type: 'weekly';
};

export type ReviewActionState = {
  error: string;
  draft: WeeklyReviewDraftPayload | null;
  savedReviewId?: string;
};

async function requireReviewUser() {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  return {
    ...user,
    activityContext: buildWebActivityContext({
      userId: user.id,
      actorLabel: 'You',
    }),
  };
}

function trimmed(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

export async function generateWeeklyDraftAction(
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const user = await requireReviewUser();
  if (!user) {
    return { error: '未授权', draft: null };
  }

  try {
    const draft = await buildWeeklyReviewDraft(
      trimmed(formData, 'periodStart'),
      trimmed(formData, 'periodEnd'),
    );
    return { error: '', draft };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '生成复盘草稿失败',
      draft: null,
    };
  }
}

export async function saveReviewDraftAction(
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const user = await requireReviewUser();
  if (!user) {
    return { error: '未授权', draft: null };
  }

  try {
    const rawSummary = trimmed(formData, 'structuredSummary');
    const keyResultIds = trimmed(formData, 'keyResultIds')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const review = await saveReviewDraft({
      type: 'weekly',
      periodStart: trimmed(formData, 'periodStart'),
      periodEnd: trimmed(formData, 'periodEnd'),
      title: trimmed(formData, 'title'),
      body: trimmed(formData, 'body'),
      structuredSummary: rawSummary ? JSON.parse(rawSummary) as Record<string, unknown> : {},
      keyResultIds,
    }, { activityContext: user.activityContext });

    if (!review) {
      return { error: '保存复盘草稿失败', draft: null };
    }

    revalidatePath('/review');
    revalidatePath('/dashboard');
    revalidatePath('/activity');

    return {
      error: '',
      draft: {
        type: 'weekly',
        periodStart: review.periodStart,
        periodEnd: review.periodEnd,
        title: review.title,
        body: review.body,
        structuredSummary: (review.structuredSummary ?? {}) as Record<string, unknown>,
        keyResultIds: review.krSnapshots.map((snapshot: { keyResultId: string }) => snapshot.keyResultId),
      },
      savedReviewId: review.id,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '保存复盘草稿失败',
      draft: null,
    };
  }
}

export async function finalizeReviewAction(reviewId: string) {
  const user = await requireReviewUser();
  if (!user) {
    return;
  }

  const review = await finalizeReview(reviewId, { activityContext: user.activityContext });
  if (!review) {
    return;
  }
  revalidatePath('/review');
  revalidatePath('/dashboard');
  revalidatePath('/activity');
}
