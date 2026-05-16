import { and, asc, desc, eq, inArray, lte, gte, ne } from 'drizzle-orm';
import { db, schema } from '@stride-os/db';
import {
  getTaskProgressSnapshotForKeyResult,
  listTaskProgressSnapshotsForKeyResults,
  listTasksForKeyResult,
} from './task-service';
import {
  buildActivityDiff,
  recordActivity,
  type ActivityContext,
  type ActivityMetadata,
} from './activity-service';

type TransactionLike = {
  insert: typeof db.insert;
  update: typeof db.update;
};

export const PERIOD_TYPES = ['year', 'quarter', 'month', 'custom'] as const;
export const PERIOD_STATUSES = ['active', 'archived'] as const;
export const OBJECTIVE_STATUSES = ['active', 'done', 'archived'] as const;
export const KEY_RESULT_STATUSES = ['active', 'at_risk', 'done', 'archived'] as const;

export type PeriodType = typeof PERIOD_TYPES[number];
export type PeriodStatus = typeof PERIOD_STATUSES[number];
export type ObjectiveStatus = typeof OBJECTIVE_STATUSES[number];
export type KeyResultStatus = typeof KEY_RESULT_STATUSES[number];

export type PeriodWriteInput = {
  name: string;
  type: PeriodType;
  startDate: string;
  endDate: string;
  status?: PeriodStatus;
};

export type ObjectiveWriteInput = {
  periodId: string;
  title: string;
  description?: string | null;
  status?: ObjectiveStatus;
  sortOrder?: number;
};

export type KeyResultWriteInput = {
  objectiveId: string;
  title: string;
  description?: string | null;
  status?: KeyResultStatus;
};

export type CheckInWriteInput = {
  keyResultId: string;
  summary?: string | null;
  blockers?: string | null;
  nextActions?: string | null;
};

export type OkrMutationOptions = {
  activityContext?: ActivityContext;
};

type TaskProgressSnapshot = Awaited<ReturnType<typeof getTaskProgressSnapshotForKeyResult>>;

type LatestCheckInSummary = {
  hasCheckIn: boolean;
  summary: string | null;
  blockers: string | null;
  nextActions: string | null;
  updatedAt: Date | null;
};

function withActivityContextMetadata(options?: OkrMutationOptions, metadata?: ActivityMetadata | null) {
  return {
    actorLabel: options?.activityContext?.actorLabel ?? undefined,
    sourceLabel: options?.activityContext?.sourceLabel ?? undefined,
    requestId: options?.activityContext?.requestId ?? undefined,
    command: options?.activityContext?.command ?? undefined,
    ...(metadata ?? {}),
  };
}

async function recordOkrActivity(input: {
  options?: OkrMutationOptions;
  action: string;
  targetType: 'period' | 'objective' | 'key_result';
  targetId: string;
  targetTitle: string;
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
    targetType: input.targetType,
    targetId: input.targetId,
    targetTitle: input.targetTitle,
    source: input.options.activityContext.source,
    summary: input.summary,
    metadata: withActivityContextMetadata(input.options, input.metadata),
  });
}

function ensureTrimmed(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field} 不能为空。`);
  }

  return normalized;
}

function validateInSet<T extends string>(value: T, allowed: readonly T[], field: string) {
  if (!allowed.includes(value)) {
    throw new Error(`${field} 不支持值：${value}`);
  }

  return value;
}

function validateDateRange(startDate: string, endDate: string) {
  if (endDate < startDate) {
    throw new Error('结束日期不能早于开始日期。');
  }
}

function buildEmptyTaskProgress(keyResultId: string): TaskProgressSnapshot {
  return {
    keyResultId,
    committedTaskCount: 0,
    completedCommittedTaskCount: 0,
    openCommittedTaskCount: 0,
    hasCommittedTasks: false,
    lastTaskProgressAt: null,
  };
}

function buildLatestCheckInSummary(checkIn?: {
  summary?: string | null;
  blockers?: string | null;
  nextActions?: string | null;
  createdAt?: Date | null;
} | null): LatestCheckInSummary {
  return {
    hasCheckIn: Boolean(checkIn),
    summary: checkIn?.summary ?? null,
    blockers: checkIn?.blockers ?? null,
    nextActions: checkIn?.nextActions ?? null,
    updatedAt: checkIn?.createdAt ?? null,
  };
}

async function enrichKeyResultsWithProgress<
  T extends {
    id: string;
    title?: string;
    checkIns?: Array<{
      summary?: string | null;
      blockers?: string | null;
      nextActions?: string | null;
      createdAt: Date;
    }>;
  },
>(keyResults: T[]) {
  if (keyResults.length === 0) {
    return [];
  }

  const taskProgressByKeyResult = new Map(
    (await listTaskProgressSnapshotsForKeyResults(keyResults.map((keyResult) => keyResult.id)))
      .map((snapshot) => [snapshot.keyResultId, snapshot]),
  );

  return keyResults.map((keyResult) => ({
    ...keyResult,
    taskProgress: taskProgressByKeyResult.get(keyResult.id) ?? buildEmptyTaskProgress(keyResult.id),
    latestCheckIn: buildLatestCheckInSummary(keyResult.checkIns?.[0] ?? null),
  }));
}

async function enrichObjectivesWithProgress<
  T extends {
    title?: string;
    keyResults: Array<{
      id: string;
      title?: string;
      checkIns?: Array<{
        summary?: string | null;
        blockers?: string | null;
        nextActions?: string | null;
        createdAt: Date;
      }>;
    }>;
  },
>(objectives: T[]) {
  const keyResults = objectives.flatMap((objective) => objective.keyResults);
  const enrichedKeyResults = await enrichKeyResultsWithProgress(keyResults);
  const enrichedById = new Map(enrichedKeyResults.map((keyResult) => [keyResult.id, keyResult]));

  return objectives.map((objective) => ({
    ...objective,
    keyResults: objective.keyResults.map((keyResult) => enrichedById.get(keyResult.id) ?? keyResult),
  }));
}

async function enrichPeriodsWithProgress<
  T extends {
    objectives: Array<{
      id?: string;
      title?: string;
      keyResults: Array<{
        id: string;
        title?: string;
        checkIns?: Array<{
          summary?: string | null;
          blockers?: string | null;
          nextActions?: string | null;
          createdAt: Date;
        }>;
      }>;
    }>;
  },
>(periods: T[]) {
  const objectiveLists = await enrichObjectivesWithProgress(periods.flatMap((period) => period.objectives));
  let index = 0;

  return periods.map((period) => {
    const nextObjectives = objectiveLists.slice(index, index + period.objectives.length);
    index += period.objectives.length;
    return {
      ...period,
      objectives: nextObjectives,
    };
  });
}

function normalizePeriodBounds(input: PeriodWriteInput) {
  if (input.type === 'year') {
    const year = input.startDate.slice(0, 4);
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
    };
  }

  if (input.type === 'quarter') {
    return {
      startDate: input.startDate,
      endDate: input.endDate,
    };
  }

  return {
    startDate: input.startDate,
    endDate: input.endDate,
  };
}

function normalizePeriodInput(input: PeriodWriteInput) {
  const name = ensureTrimmed(input.name, '周期名称');
  const type = validateInSet(input.type, PERIOD_TYPES, '周期类型');
  const status = validateInSet(input.status ?? 'active', PERIOD_STATUSES, '周期状态');
  const { startDate, endDate } = normalizePeriodBounds(input);
  validateDateRange(startDate, endDate);

  return {
    name,
    type,
    startDate,
    endDate,
    status,
  };
}

function normalizeObjectiveInput(input: ObjectiveWriteInput) {
  return {
    periodId: input.periodId,
    title: ensureTrimmed(input.title, '目标标题'),
    description: input.description?.trim() || null,
    status: validateInSet(input.status ?? 'active', OBJECTIVE_STATUSES, '目标状态'),
    sortOrder: input.sortOrder ?? 0,
  };
}

function normalizeKeyResultInput(input: KeyResultWriteInput) {
  return {
    objectiveId: input.objectiveId,
    title: ensureTrimmed(input.title, '关键结果标题'),
    description: input.description?.trim() || null,
    status: validateInSet(input.status ?? 'active', KEY_RESULT_STATUSES, '关键结果状态'),
  };
}

function normalizeCheckInInput(input: CheckInWriteInput) {
  return {
    keyResultId: input.keyResultId,
    summary: input.summary?.trim() || null,
    blockers: input.blockers?.trim() || null,
    nextActions: input.nextActions?.trim() || null,
  };
}

export async function listPeriods() {
  const periods = await db.query.periods.findMany({
    orderBy: [desc(schema.periods.startDate), desc(schema.periods.createdAt)],
    with: {
      objectives: {
        with: {
          keyResults: {
            with: {
              checkIns: {
                orderBy: [desc(schema.krCheckIns.createdAt)],
              },
            },
          },
        },
      },
    },
  });

  return enrichPeriodsWithProgress(periods);
}

export async function getCurrentPeriod() {
  const today = new Date().toISOString().slice(0, 10);
  const active = await db.query.periods.findFirst({
    where: and(
      eq(schema.periods.status, 'active'),
      lte(schema.periods.startDate, today),
      gte(schema.periods.endDate, today),
    ),
    orderBy: [desc(schema.periods.startDate)],
    with: {
      objectives: {
        with: {
          keyResults: {
            with: {
              checkIns: {
                orderBy: [desc(schema.krCheckIns.createdAt)],
              },
            },
          },
        },
      },
    },
  });

  if (active) {
    const [enriched] = await enrichPeriodsWithProgress([active]);
    return enriched ?? active;
  }

  const fallback = await db.query.periods.findFirst({
    where: eq(schema.periods.status, 'active'),
    orderBy: [desc(schema.periods.startDate)],
    with: {
      objectives: {
        with: {
          keyResults: {
            with: {
              checkIns: {
                orderBy: [desc(schema.krCheckIns.createdAt)],
              },
            },
          },
        },
      },
    },
  });

  if (!fallback) {
    return null;
  }

  const [enriched] = await enrichPeriodsWithProgress([fallback]);
  return enriched ?? fallback;
}

export async function getPeriod(periodId: string) {
  const period = await db.query.periods.findFirst({
    where: eq(schema.periods.id, periodId),
    with: {
      objectives: {
        orderBy: [asc(schema.objectives.sortOrder), asc(schema.objectives.createdAt)],
        with: {
          keyResults: {
            with: {
              checkIns: {
                orderBy: [desc(schema.krCheckIns.createdAt)],
              },
            },
          },
        },
      },
    },
  });

  if (!period) {
    return null;
  }

  const [enriched] = await enrichPeriodsWithProgress([period]);
  return enriched ?? period;
}

export async function createPeriod(input: PeriodWriteInput, _options?: OkrMutationOptions) {
  const normalized = normalizePeriodInput(input);
  const [period] = await db.insert(schema.periods).values(normalized).returning();
  if (period) {
    await recordOkrActivity({
      options: _options,
      action: 'okr.period.create',
      targetType: 'period',
      targetId: period.id,
      targetTitle: period.name,
      summary: `Created OKR period ${period.name}`,
    });
  }
  return period;
}

export async function updatePeriod(
  periodId: string,
  input: Partial<PeriodWriteInput>,
  _options?: OkrMutationOptions,
) {
  const existing = await db.query.periods.findFirst({
    where: eq(schema.periods.id, periodId),
  });
  if (!existing) {
    return null;
  }

  const patch = {
    updatedAt: new Date(),
  } as {
    name?: string;
    type?: PeriodType;
    startDate?: string;
    endDate?: string;
    status?: PeriodStatus;
    updatedAt: Date;
  };

  if (input.name !== undefined) patch.name = ensureTrimmed(input.name, '周期名称');
  if (input.type !== undefined) patch.type = validateInSet(input.type, PERIOD_TYPES, '周期类型');
  if (input.startDate !== undefined) patch.startDate = input.startDate;
  if (input.endDate !== undefined) patch.endDate = input.endDate;
  if (input.status !== undefined) patch.status = validateInSet(input.status, PERIOD_STATUSES, '周期状态');
  if (patch.startDate && patch.endDate) validateDateRange(patch.startDate, patch.endDate);

  const [period] = await db
    .update(schema.periods)
    .set(patch)
    .where(eq(schema.periods.id, periodId))
    .returning();

  if (period) {
    await recordOkrActivity({
      options: _options,
      action: input.status === 'archived' ? 'okr.period.archive' : 'okr.period.update',
      targetType: 'period',
      targetId: period.id,
      targetTitle: period.name,
      summary: input.status === 'archived'
        ? `Archived OKR period ${period.name}`
        : `Updated OKR period ${period.name}`,
      metadata: buildActivityDiff(existing, period, ['name', 'type', 'startDate', 'endDate', 'status']),
    });
  }

  return period ?? null;
}

export async function archivePeriod(periodId: string, options?: OkrMutationOptions) {
  return updatePeriod(periodId, { status: 'archived' }, options);
}

export async function listObjectives(periodId: string) {
  const objectives = await db.query.objectives.findMany({
    where: and(eq(schema.objectives.periodId, periodId), ne(schema.objectives.status, 'archived')),
    orderBy: [asc(schema.objectives.sortOrder), asc(schema.objectives.createdAt)],
    with: {
      keyResults: {
        with: {
          checkIns: {
            orderBy: [desc(schema.krCheckIns.createdAt)],
          },
        },
      },
    },
  });

  return enrichObjectivesWithProgress(objectives);
}

export async function getObjective(objectiveId: string) {
  const objective = await db.query.objectives.findFirst({
    where: eq(schema.objectives.id, objectiveId),
    with: {
      period: true,
      keyResults: {
        with: {
          checkIns: {
            orderBy: [desc(schema.krCheckIns.createdAt)],
          },
        },
      },
    },
  });

  if (!objective) {
    return null;
  }

  const [enriched] = await enrichObjectivesWithProgress([objective]);
  return enriched ?? objective;
}

export async function createObjective(input: ObjectiveWriteInput, _options?: OkrMutationOptions) {
  const normalized = normalizeObjectiveInput(input);
  const [objective] = await db.insert(schema.objectives).values(normalized).returning();
  if (objective) {
    await recordOkrActivity({
      options: _options,
      action: 'okr.objective.create',
      targetType: 'objective',
      targetId: objective.id,
      targetTitle: objective.title,
      summary: `Created objective ${objective.title}`,
    });
  }
  return objective;
}

export async function updateObjective(
  objectiveId: string,
  input: Partial<ObjectiveWriteInput>,
  _options?: OkrMutationOptions,
) {
  const existing = await db.query.objectives.findFirst({
    where: eq(schema.objectives.id, objectiveId),
  });
  if (!existing) {
    return null;
  }

  const patch = {
    updatedAt: new Date(),
  } as {
    title?: string;
    description?: string | null;
    status?: ObjectiveStatus;
    sortOrder?: number;
    updatedAt: Date;
  };

  if (input.title !== undefined) patch.title = ensureTrimmed(input.title, 'Objective title');
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  if (input.status !== undefined) patch.status = validateInSet(input.status, OBJECTIVE_STATUSES, 'objective status');
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

  const [objective] = await db
    .update(schema.objectives)
    .set(patch)
    .where(eq(schema.objectives.id, objectiveId))
    .returning();

  if (objective) {
    await recordOkrActivity({
      options: _options,
      action: input.status === 'archived' ? 'okr.objective.archive' : 'okr.objective.update',
      targetType: 'objective',
      targetId: objective.id,
      targetTitle: objective.title,
      summary: input.status === 'archived'
        ? `Archived objective ${objective.title}`
        : `Updated objective ${objective.title}`,
      metadata: buildActivityDiff(existing, objective, ['title', 'description', 'status', 'sortOrder']),
    });
  }

  return objective ?? null;
}

export async function getKeyResult(keyResultId: string) {
  return db.query.keyResults.findFirst({
    where: eq(schema.keyResults.id, keyResultId),
    with: {
      objective: {
        with: {
          period: true,
        },
      },
      checkIns: {
        orderBy: [desc(schema.krCheckIns.createdAt)],
      },
      taskLinks: {
        with: {
          task: true,
        },
      },
    },
  });
}

export async function createKeyResult(input: KeyResultWriteInput, _options?: OkrMutationOptions) {
  const normalized = normalizeKeyResultInput(input);
  const [keyResult] = await db.insert(schema.keyResults).values(normalized).returning();
  if (keyResult) {
    await recordOkrActivity({
      options: _options,
      action: 'okr.key_result.create',
      targetType: 'key_result',
      targetId: keyResult.id,
      targetTitle: keyResult.title,
      summary: `Created key result ${keyResult.title}`,
    });
  }
  return keyResult;
}

export async function updateKeyResult(
  keyResultId: string,
  input: Partial<KeyResultWriteInput>,
  _options?: OkrMutationOptions,
) {
  const existing = await db.query.keyResults.findFirst({
    where: eq(schema.keyResults.id, keyResultId),
  });
  if (!existing) {
    return null;
  }

  const patch = {
    updatedAt: new Date(),
  } as {
    title?: string;
    description?: string | null;
    status?: KeyResultStatus;
    updatedAt: Date;
  };

  if (input.title !== undefined) patch.title = ensureTrimmed(input.title, 'Key result title');
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  if (input.status !== undefined) patch.status = validateInSet(input.status, KEY_RESULT_STATUSES, 'key result status');

  const [keyResult] = await db
    .update(schema.keyResults)
    .set(patch)
    .where(eq(schema.keyResults.id, keyResultId))
    .returning();

  if (keyResult) {
    await recordOkrActivity({
      options: _options,
      action: input.status === 'archived' ? 'okr.key_result.archive' : 'okr.key_result.update',
      targetType: 'key_result',
      targetId: keyResult.id,
      targetTitle: keyResult.title,
      summary: input.status === 'archived'
        ? `Archived key result ${keyResult.title}`
        : `Updated key result ${keyResult.title}`,
      metadata: buildActivityDiff(existing, keyResult, ['title', 'description', 'status']),
    });
  }

  return keyResult ?? null;
}

export async function createKrCheckIn(input: CheckInWriteInput, _options?: OkrMutationOptions) {
  const normalized = normalizeCheckInInput(input);

  return db.transaction(async (tx: TransactionLike) => {
    const [checkIn] = await tx.insert(schema.krCheckIns).values(normalized).returning();
    const keyResult = await db.query.keyResults.findFirst({
      where: eq(schema.keyResults.id, normalized.keyResultId),
    });

    if (keyResult) {
      await recordOkrActivity({
        options: _options,
        action: 'okr.key_result.check_in',
        targetType: 'key_result',
        targetId: keyResult.id,
        targetTitle: keyResult.title,
        summary: `Checked in key result ${keyResult.title}`,
        metadata: {
          summary: normalized.summary,
          blockers: normalized.blockers,
          nextActions: normalized.nextActions,
        },
      });
    }

    return checkIn;
  });
}

export async function listKeyResultCheckIns(keyResultId: string) {
  return db.query.krCheckIns.findMany({
    where: eq(schema.krCheckIns.keyResultId, keyResultId),
    orderBy: [desc(schema.krCheckIns.createdAt)],
  });
}

export async function getKeyResultProgressSnapshot(keyResultId: string) {
  const keyResult = await db.query.keyResults.findFirst({
    where: eq(schema.keyResults.id, keyResultId),
  });

  if (!keyResult) {
    return null;
  }

  const latestCheckIn = await db.query.krCheckIns.findFirst({
    where: eq(schema.krCheckIns.keyResultId, keyResultId),
    orderBy: [desc(schema.krCheckIns.createdAt)],
  });
  const taskProgress = await getTaskProgressSnapshotForKeyResult(keyResultId);

  return {
    keyResultId,
    taskProgress,
    ...buildLatestCheckInSummary(latestCheckIn),
  };
}

export async function listRiskKeyResults(options?: { staleSince?: Date }) {
  const staleSince = options?.staleSince ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const keyResults = await db.query.keyResults.findMany({
    where: inArray(schema.keyResults.status, ['active', 'at_risk']),
    with: {
      objective: {
        with: {
          period: true,
        },
      },
      checkIns: {
        orderBy: [desc(schema.krCheckIns.createdAt)],
      },
    },
  });
  const taskProgressByKeyResult = new Map(
    (await listTaskProgressSnapshotsForKeyResults(
      keyResults.map((keyResult: { id: string }) => keyResult.id),
    )).map((snapshot) => [snapshot.keyResultId, snapshot]),
  );

  type RiskKeyResult = (typeof keyResults)[number];

  return keyResults
    .filter((keyResult: RiskKeyResult) => {
      const latest = keyResult.checkIns[0];
      const taskProgress = taskProgressByKeyResult.get(keyResult.id);
      const hasRecentTaskProgress = Boolean(
        taskProgress?.lastTaskProgressAt && taskProgress.lastTaskProgressAt >= staleSince,
      );
      return keyResult.status === 'at_risk'
        || ((!latest || latest.createdAt < staleSince) && !hasRecentTaskProgress);
    })
    .map((keyResult: RiskKeyResult) => ({
      ...keyResult,
      taskProgress: taskProgressByKeyResult.get(keyResult.id) ?? buildEmptyTaskProgress(keyResult.id),
      latestCheckIn: buildLatestCheckInSummary(keyResult.checkIns[0] ?? null),
    }));
}

export async function listCurrentPeriodObjectives() {
  const currentPeriod = await getCurrentPeriod();
  if (!currentPeriod) {
    return [];
  }

  return listObjectives(currentPeriod.id);
}

export async function getCurrentPeriodSummary() {
  const currentPeriod = await getCurrentPeriod();
  if (!currentPeriod) {
    return null;
  }

  const objectiveCount = currentPeriod.objectives.length;
  const keyResults = currentPeriod.objectives.flatMap(
    (objective: { keyResults: Array<{ status: string }> }) => objective.keyResults,
  );
  const activeKeyResults = keyResults.filter((item: { status: string }) => item.status === 'active' || item.status === 'at_risk');

  return {
    period: currentPeriod,
    objectiveCount,
    keyResultCount: keyResults.length,
    activeKeyResultCount: activeKeyResults.length,
  };
}

export async function getKeyResultDetail(keyResultId: string) {
  const keyResult = await getKeyResult(keyResultId);
  if (!keyResult) {
    return null;
  }

  const taskList = await listTasksForKeyResult(keyResultId);
  const progress = await getKeyResultProgressSnapshot(keyResultId);

  return {
    ...keyResult,
    tasks: taskList,
    progress,
    taskProgress: progress?.taskProgress ?? null,
    latestCheckIn: progress
      ? buildLatestCheckInSummary({
          summary: progress.summary,
          blockers: progress.blockers,
          nextActions: progress.nextActions,
          createdAt: progress.updatedAt,
        })
      : buildLatestCheckInSummary(null),
  };
}

export async function listKeyResultsWithoutCheckIns() {
  return db.query.keyResults.findMany({
    with: {
      checkIns: {
        orderBy: [desc(schema.krCheckIns.createdAt)],
      },
    },
    orderBy: [asc(schema.keyResults.createdAt)],
  }).then((items: Array<{ checkIns: unknown[] }>) => items.filter((item: { checkIns: unknown[] }) => item.checkIns.length === 0));
}

export async function listCheckInsInRange(periodStart: string, periodEnd: string) {
  return db.query.krCheckIns.findMany({
    orderBy: [desc(schema.krCheckIns.createdAt)],
    with: {
      keyResult: {
        with: {
          objective: true,
        },
      },
    },
  }).then((items: Array<{ createdAt: Date }>) =>
    items.filter((item: { createdAt: Date }) => {
      const created = item.createdAt.toISOString().slice(0, 10);
      return created >= periodStart && created <= periodEnd;
    }),
  );
}

export async function listKeyResultsByIds(keyResultIds: string[]) {
  if (keyResultIds.length === 0) {
    return [];
  }

  const keyResults = await db.query.keyResults.findMany({
    where: inArray(schema.keyResults.id, keyResultIds),
    orderBy: [asc(schema.keyResults.createdAt)],
    with: {
      objective: true,
      checkIns: {
        orderBy: [desc(schema.krCheckIns.createdAt)],
      },
    },
  });

  return enrichKeyResultsWithProgress(keyResults);
}
