import { and, desc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@stride-os/db';
import { getConfidenceLabel } from '@/lib/presentation/labels';
import {
  getCurrentPeriodSummary,
  listCheckInsInRange,
  listKeyResultsByIds,
  listRiskKeyResults,
} from './okr-service';
import {
  ensureTodayRecurringTasks,
  listCompletedTasksBetween,
  listTaskDashboardCounts,
  listOpenTodayDueTasks,
  listTodayTaskCounts,
} from './task-service';

type TransactionLike = {
  query: typeof db.query;
  insert: typeof db.insert;
  update: typeof db.update;
  delete: typeof db.delete;
};

export const REVIEW_TYPES = ['weekly', 'monthly', 'period'] as const;
export const REVIEW_STATUSES = ['draft', 'final'] as const;

export type ReviewType = typeof REVIEW_TYPES[number];
export type ReviewStatus = typeof REVIEW_STATUSES[number];

export type ReviewDraftPayload = {
  type: ReviewType;
  periodStart: string;
  periodEnd: string;
  title: string;
  body: string;
  structuredSummary: Record<string, unknown>;
  keyResultIds: string[];
};

function ensureReviewType(type: ReviewType) {
  if (!REVIEW_TYPES.includes(type)) {
    throw new Error(`复盘类型不支持值：${type}`);
  }

  return type;
}

function ensureReviewStatus(status: ReviewStatus) {
  if (!REVIEW_STATUSES.includes(status)) {
    throw new Error(`复盘状态不支持值：${status}`);
  }

  return status;
}

function buildReviewBody(input: {
  completedTaskTitles: string[];
  openTodayDueTitles: string[];
  keyResultSummaries: string[];
}) {
  const wins = input.completedTaskTitles.length > 0
    ? input.completedTaskTitles.map((title) => `- ${title}`).join('\n')
    : '- 本周期没有记录到已完成任务';
  const followUps = input.openTodayDueTitles.length > 0
    ? input.openTodayDueTitles.map((title) => `- ${title}`).join('\n')
    : '- 没有今日到期但未完成的任务';
  const keyResults = input.keyResultSummaries.length > 0
    ? input.keyResultSummaries.map((line) => `- ${line}`).join('\n')
    : '- 没有记录到 KR check-in';

  return [
    '## 本期成果',
    wins,
    '',
    '## 今日到期但未完成',
    followUps,
    '',
    '## KR 进展',
    keyResults,
  ].join('\n');
}

export async function listReviews() {
  return db.query.reviews.findMany({
    orderBy: [desc(schema.reviews.periodStart), desc(schema.reviews.createdAt)],
    with: {
      krSnapshots: true,
    },
  });
}

export async function getReview(reviewId: string) {
  return db.query.reviews.findFirst({
    where: eq(schema.reviews.id, reviewId),
    with: {
      krSnapshots: true,
    },
  });
}

export async function buildWeeklyReviewDraft(periodStart: string, periodEnd: string) {
  await ensureTodayRecurringTasks();

  const [completedTasks, openTodayDueTasks, checkIns] = await Promise.all([
    listCompletedTasksBetween(periodStart, periodEnd),
    listOpenTodayDueTasks(),
    listCheckInsInRange(periodStart, periodEnd),
  ]);

  const latestCheckInsByKr = new Map<string, (typeof checkIns)[number]>();
  for (const checkIn of checkIns) {
    if (!latestCheckInsByKr.has(checkIn.keyResultId)) {
      latestCheckInsByKr.set(checkIn.keyResultId, checkIn);
    }
  }

  const keyResultIds = Array.from(latestCheckInsByKr.keys());
  const keyResults = await listKeyResultsByIds(keyResultIds);
  const keyedResults = new Map<string, { id: string; title: string }>(
    keyResults.map((item: { id: string; title: string }) => [item.id, item]),
  );

  const keyResultSummaries = Array.from(latestCheckInsByKr.values()).map((checkIn) => {
    const keyResult = keyedResults.get(checkIn.keyResultId);
    const title = keyResult?.title ?? checkIn.keyResultId;
    return `${title}: ${checkIn.summary || '无总结'}（信心：${getConfidenceLabel(checkIn.confidence)}）`;
  });

  const structuredSummary = {
    completedTaskCount: completedTasks.length,
    openTodayDueCount: openTodayDueTasks.length,
    completedTaskIds: completedTasks.map((task: { id: string }) => task.id),
    openTodayDueTaskIds: openTodayDueTasks.map((task: { id: string }) => task.id),
    keyResultIds,
    keyResultCheckIns: Array.from(latestCheckInsByKr.values()).map((item) => ({
      keyResultId: item.keyResultId,
      confidence: item.confidence,
      progressValue: item.progressValue,
      summary: item.summary,
      blockers: item.blockers,
      nextActions: item.nextActions,
      createdAt: item.createdAt.toISOString(),
    })),
  } satisfies Record<string, unknown>;

  const body = buildReviewBody({
    completedTaskTitles: completedTasks.map((task: { title: string }) => task.title),
    openTodayDueTitles: openTodayDueTasks.map((task: { title: string }) => task.title),
    keyResultSummaries,
  });

  return {
    type: 'weekly' as const,
    periodStart,
    periodEnd,
    title: `周复盘 ${periodStart} - ${periodEnd}`,
    body,
    structuredSummary,
    keyResultIds,
  };
}

export async function saveReviewDraft(input: ReviewDraftPayload) {
  const normalizedType = ensureReviewType(input.type);

  return db.transaction(async (tx: TransactionLike) => {
    const existingDraft = await tx.query.reviews.findFirst({
      where: and(
        eq(schema.reviews.type, normalizedType),
        eq(schema.reviews.periodStart, input.periodStart),
        eq(schema.reviews.periodEnd, input.periodEnd),
        eq(schema.reviews.status, 'draft'),
      ),
    });

    const review = existingDraft
      ? (await tx
          .update(schema.reviews)
          .set({
            title: input.title,
            body: input.body,
            structuredSummary: input.structuredSummary,
            updatedAt: new Date(),
          })
          .where(eq(schema.reviews.id, existingDraft.id))
          .returning())[0]
      : (await tx
          .insert(schema.reviews)
          .values({
            type: normalizedType,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            status: 'draft',
            title: input.title,
            body: input.body,
            structuredSummary: input.structuredSummary,
          })
          .returning())[0];

    await tx.delete(schema.reviewKrSnapshots).where(eq(schema.reviewKrSnapshots.reviewId, review.id));

    if (input.keyResultIds.length > 0) {
      const keyResults = await tx.query.keyResults.findMany({
        where: inArray(schema.keyResults.id, input.keyResultIds),
        with: {
          checkIns: {
            orderBy: [desc(schema.krCheckIns.createdAt)],
          },
        },
      });

      await tx.insert(schema.reviewKrSnapshots).values(
        keyResults.map((keyResult: { id: string; title: string; status: string; currentValue: number | null; checkIns: Array<{ confidence: string; createdAt: Date }> }) => ({
          reviewId: review.id,
          keyResultId: keyResult.id,
          snapshot: {
            title: keyResult.title,
            status: keyResult.status,
            currentValue: keyResult.currentValue,
            confidence: keyResult.checkIns[0]?.confidence ?? null,
            latestCheckInAt: keyResult.checkIns[0]?.createdAt.toISOString() ?? null,
          },
        })),
      );
    }

    return tx.query.reviews.findFirst({
      where: eq(schema.reviews.id, review.id),
      with: {
        krSnapshots: true,
      },
    });
  });
}

export async function finalizeReview(reviewId: string) {
  const review = await db.query.reviews.findFirst({
    where: eq(schema.reviews.id, reviewId),
  });

  if (!review) {
    return null;
  }

  const normalizedType = ensureReviewType(review.type);
  const existingFinal = await db.query.reviews.findFirst({
    where: and(
      eq(schema.reviews.type, normalizedType),
      eq(schema.reviews.periodStart, review.periodStart),
      eq(schema.reviews.periodEnd, review.periodEnd),
      eq(schema.reviews.status, 'final'),
    ),
    orderBy: [desc(schema.reviews.updatedAt)],
  });

  if (existingFinal && existingFinal.id !== reviewId) {
    throw new Error('A final review already exists for this period.');
  }

  const [finalized] = await db
    .update(schema.reviews)
    .set({
      status: ensureReviewStatus('final'),
      updatedAt: new Date(),
    })
    .where(eq(schema.reviews.id, reviewId))
    .returning();

  return finalized ?? null;
}

export async function updateReviewDraftById(
  reviewId: string,
  input: {
    title?: string;
    body?: string;
    structuredSummary?: Record<string, unknown>;
  },
) {
  const [review] = await db
    .update(schema.reviews)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.structuredSummary !== undefined ? { structuredSummary: input.structuredSummary } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.reviews.id, reviewId))
    .returning();

  return review ?? null;
}

export async function getLatestReview() {
  return db.query.reviews.findFirst({
    orderBy: [desc(schema.reviews.periodStart), desc(schema.reviews.createdAt)],
    with: {
      krSnapshots: true,
    },
  });
}

export async function getDashboardSummary() {
  await ensureTodayRecurringTasks();

  const [currentPeriodSummary, todayTaskCounts, taskDashboardCounts, riskKeyResults, latestReview] = await Promise.all([
    getCurrentPeriodSummary(),
    listTodayTaskCounts(),
    listTaskDashboardCounts(),
    listRiskKeyResults(),
    getLatestReview(),
  ]);

  return {
    currentPeriodSummary,
    todayTaskCounts,
    chartStats: {
      taskDashboardCounts,
    },
    riskKeyResults,
    latestReview,
  };
}

export async function listDraftReviews() {
  return db.query.reviews.findMany({
    where: eq(schema.reviews.status, 'draft'),
    orderBy: [desc(schema.reviews.periodStart), desc(schema.reviews.updatedAt)],
  });
}

export async function listFinalReviews() {
  return db.query.reviews.findMany({
    where: eq(schema.reviews.status, 'final'),
    orderBy: [desc(schema.reviews.periodStart), desc(schema.reviews.updatedAt)],
  });
}

export async function listReviewHistoryByType(type: ReviewType) {
  const normalizedType = ensureReviewType(type);
  return db.query.reviews.findMany({
    where: eq(schema.reviews.type, normalizedType),
    orderBy: [desc(schema.reviews.periodStart), desc(schema.reviews.updatedAt)],
    with: {
      krSnapshots: true,
    },
  });
}

export async function getReviewDraftOrGenerate(periodStart: string, periodEnd: string) {
  const existingDraft = await db.query.reviews.findFirst({
    where: and(
      eq(schema.reviews.type, 'weekly'),
      eq(schema.reviews.periodStart, periodStart),
      eq(schema.reviews.periodEnd, periodEnd),
      eq(schema.reviews.status, 'draft'),
    ),
    with: {
      krSnapshots: true,
    },
  });

  if (existingDraft) {
    return existingDraft;
  }

  return buildWeeklyReviewDraft(periodStart, periodEnd);
}

export async function summarizeWeeklyInputs(periodStart: string, periodEnd: string) {
  const [completedTasks, openTodayDueTasks, checkIns] = await Promise.all([
    listCompletedTasksBetween(periodStart, periodEnd),
    listOpenTodayDueTasks(),
    listCheckInsInRange(periodStart, periodEnd),
  ]);

  return {
    completedTasks,
    openTodayDueTasks,
    checkIns,
  };
}

export async function getReviewIndexSummary() {
  const [draftReviews, finalReviews, currentPeriodSummary] = await Promise.all([
    listDraftReviews(),
    listFinalReviews(),
    getCurrentPeriodSummary(),
  ]);

  return {
    draftCount: draftReviews.length,
    finalCount: finalReviews.length,
    currentPeriodSummary,
  };
}
