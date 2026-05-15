import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db, schema } from '@stride-os/db';
import { getConfidenceLabel } from '@/lib/presentation/labels';
import {
  buildActivityDiff,
  recordActivity,
  type ActivityContext,
  type ActivityMetadata,
} from './activity-service';
import {
  getCurrentPeriodSummary,
  listCheckInsInRange,
  listKeyResultsByIds,
  listRiskKeyResults,
} from './okr-service';
import {
  ensureTodayRecurringTasks,
  listTaskProgressSnapshotsForKeyResults,
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

export type ReviewMutationOptions = {
  activityContext?: ActivityContext;
};

function withReviewActivityContextMetadata(options?: ReviewMutationOptions, metadata?: ActivityMetadata | null) {
  return {
    actorLabel: options?.activityContext?.actorLabel ?? undefined,
    sourceLabel: options?.activityContext?.sourceLabel ?? undefined,
    requestId: options?.activityContext?.requestId ?? undefined,
    command: options?.activityContext?.command ?? undefined,
    ...(metadata ?? {}),
  };
}

async function recordReviewActivity(input: {
  options?: ReviewMutationOptions;
  action: string;
  reviewId: string;
  title: string;
  summary: string;
  metadata?: ActivityMetadata | null;
}) {
  if (!input.options?.activityContext) {
    return;
  }

  await recordActivity({
    actorType: input.options.activityContext.actorType,
    actorId: input.options.activityContext.actorId ?? null,
    action: input.action,
    targetType: 'review',
    targetId: input.reviewId,
    targetTitle: input.title,
    source: input.options.activityContext.source,
    summary: input.summary,
    metadata: withReviewActivityContextMetadata(input.options, input.metadata),
  });
}

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
    where: isNull(schema.reviews.archivedAt),
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

  const keyResultIds = Array.from(new Set([
    ...Array.from(latestCheckInsByKr.keys()),
    ...completedTasks.flatMap((task: { keyResultLinks?: Array<{ keyResult: { id: string } }> }) =>
      (task.keyResultLinks ?? []).map((link) => link.keyResult.id),
    ),
  ]));
  const keyResults = await listKeyResultsByIds(keyResultIds);
  const taskProgressByKr = new Map(
    (await listTaskProgressSnapshotsForKeyResults(keyResultIds)).map((snapshot) => [snapshot.keyResultId, snapshot]),
  );
  const keyedResults = new Map<string, { id: string; title?: string | null }>(
    keyResults.map((item) => [item.id, item]),
  );

  const keyResultSummaries = keyResultIds.map((keyResultId) => {
    const keyResult = keyedResults.get(keyResultId);
    const taskProgress = taskProgressByKr.get(keyResultId);
    const latestCheckIn = latestCheckInsByKr.get(keyResultId);
    const title = keyResult?.title ?? keyResultId;
    const taskSummary = taskProgress?.hasCommittedTasks
      ? `任务 ${taskProgress.completedCommittedTaskCount}/${taskProgress.committedTaskCount}`
      : '暂无承诺任务';
    const checkInSummary = latestCheckIn
      ? `${latestCheckIn.summary || '无总结'}（信心：${getConfidenceLabel(latestCheckIn.confidence)}）`
      : '暂无 check-in';
    return `${title}: ${taskSummary}；${checkInSummary}`;
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
    keyResultTaskProgress: keyResultIds.map((keyResultId) => {
      const taskProgress = taskProgressByKr.get(keyResultId);
      return {
        keyResultId,
        committedTaskCount: taskProgress?.committedTaskCount ?? 0,
        completedCommittedTaskCount: taskProgress?.completedCommittedTaskCount ?? 0,
        openCommittedTaskCount: taskProgress?.openCommittedTaskCount ?? 0,
      };
    }),
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

export async function saveReviewDraft(input: ReviewDraftPayload, _options?: ReviewMutationOptions) {
  const normalizedType = ensureReviewType(input.type);
  let draftMode: 'create' | 'update' = 'create';

  return db.transaction(async (tx: TransactionLike) => {
    const existingDraft = await tx.query.reviews.findFirst({
      where: and(
        eq(schema.reviews.type, normalizedType),
        eq(schema.reviews.periodStart, input.periodStart),
        eq(schema.reviews.periodEnd, input.periodEnd),
        eq(schema.reviews.status, 'draft'),
        isNull(schema.reviews.archivedAt),
      ),
    });
    draftMode = existingDraft ? 'update' : 'create';

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
        keyResults.map((keyResult: {
          id: string;
          title: string;
          status: string;
          currentValue: number | null;
          taskProgress?: {
            committedTaskCount: number;
            completedCommittedTaskCount: number;
            openCommittedTaskCount: number;
          };
          latestCheckIn?: {
            confidence: string | null;
            updatedAt: Date | string | null;
          };
          checkIns: Array<{ confidence: string; createdAt: Date }>;
        }) => ({
          reviewId: review.id,
          keyResultId: keyResult.id,
          snapshot: {
            title: keyResult.title,
            status: keyResult.status,
            committedTaskCount: keyResult.taskProgress?.committedTaskCount ?? null,
            completedCommittedTaskCount: keyResult.taskProgress?.completedCommittedTaskCount ?? null,
            openCommittedTaskCount: keyResult.taskProgress?.openCommittedTaskCount ?? null,
            currentValue: keyResult.currentValue,
            confidence: keyResult.latestCheckIn?.confidence ?? keyResult.checkIns[0]?.confidence ?? null,
            latestCheckInAt: keyResult.latestCheckIn?.updatedAt
              ? new Date(keyResult.latestCheckIn.updatedAt).toISOString()
              : (keyResult.checkIns[0]?.createdAt.toISOString() ?? null),
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
  }).then(async (review: Awaited<ReturnType<typeof db.query.reviews.findFirst>>) => {
    if (review) {
      await recordReviewActivity({
        options: _options,
        action: draftMode === 'create' ? 'review.draft.create' : 'review.draft.update',
        reviewId: review.id,
        title: review.title,
        summary: draftMode === 'create'
          ? `Created review draft ${review.title}`
          : `Saved review draft ${review.title}`,
        metadata: reviewsFindMetadata(input),
      });
    }

    return review;
  });
}

function reviewsFindMetadata(input: ReviewDraftPayload): ActivityMetadata {
  return {
    structuredSummary: input.structuredSummary,
    keyResultIds: input.keyResultIds,
  };
}

export async function finalizeReview(reviewId: string, _options?: ReviewMutationOptions) {
  const review = await db.query.reviews.findFirst({
    where: and(eq(schema.reviews.id, reviewId), isNull(schema.reviews.archivedAt)),
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
      isNull(schema.reviews.archivedAt),
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
    .where(and(eq(schema.reviews.id, reviewId), isNull(schema.reviews.archivedAt)))
    .returning();

  if (finalized) {
    await recordReviewActivity({
      options: _options,
      action: 'review.finalize',
      reviewId: finalized.id,
      title: finalized.title,
      summary: `Finalized review ${finalized.title}`,
      metadata: buildActivityDiff(review, finalized, ['status']),
    });
  }

  return finalized ?? null;
}

export async function archiveReview(reviewId: string, _options?: ReviewMutationOptions) {
  const existing = await db.query.reviews.findFirst({
    where: eq(schema.reviews.id, reviewId),
  });
  if (!existing) {
    return null;
  }

  const [review] = await db
    .update(schema.reviews)
    .set({
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.reviews.id, reviewId))
    .returning();

  if (review) {
    await recordReviewActivity({
      options: _options,
      action: 'review.archive',
      reviewId: review.id,
      title: review.title,
      summary: `Archived review ${review.title}`,
    });
  }

  return review ?? null;
}

export async function updateReviewDraftById(
  reviewId: string,
  input: {
    title?: string;
    body?: string;
    structuredSummary?: Record<string, unknown>;
  },
  _options?: ReviewMutationOptions,
) {
  const existing = await db.query.reviews.findFirst({
    where: and(eq(schema.reviews.id, reviewId), isNull(schema.reviews.archivedAt)),
  });
  if (!existing) {
    return null;
  }

  const [review] = await db
    .update(schema.reviews)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.structuredSummary !== undefined ? { structuredSummary: input.structuredSummary } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(schema.reviews.id, reviewId), isNull(schema.reviews.archivedAt)))
    .returning();

  if (review) {
    await recordReviewActivity({
      options: _options,
      action: 'review.draft.update',
      reviewId: review.id,
      title: review.title,
      summary: `Updated review draft ${review.title}`,
      metadata: buildActivityDiff(existing, review, ['title', 'body']),
    });
  }

  return review ?? null;
}

export async function getLatestReview() {
  return db.query.reviews.findFirst({
    where: isNull(schema.reviews.archivedAt),
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
    where: and(eq(schema.reviews.status, 'draft'), isNull(schema.reviews.archivedAt)),
    orderBy: [desc(schema.reviews.periodStart), desc(schema.reviews.updatedAt)],
  });
}

export async function listFinalReviews() {
  return db.query.reviews.findMany({
    where: and(eq(schema.reviews.status, 'final'), isNull(schema.reviews.archivedAt)),
    orderBy: [desc(schema.reviews.periodStart), desc(schema.reviews.updatedAt)],
  });
}

export async function listReviewHistoryByType(type: ReviewType) {
  const normalizedType = ensureReviewType(type);
  return db.query.reviews.findMany({
    where: and(eq(schema.reviews.type, normalizedType), isNull(schema.reviews.archivedAt)),
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
      isNull(schema.reviews.archivedAt),
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
