import { and, asc, desc, eq, inArray, isNull, lte, gte } from 'drizzle-orm';
import { db, schema } from '@stride-os/db';
import { listTasksForKeyResult } from './task-service';

type TransactionLike = {
  insert: typeof db.insert;
  update: typeof db.update;
};

export const PERIOD_TYPES = ['year', 'quarter', 'custom'] as const;
export const PERIOD_STATUSES = ['active', 'archived'] as const;
export const OBJECTIVE_STATUSES = ['active', 'done', 'archived'] as const;
export const KEY_RESULT_TYPES = ['numeric', 'milestone', 'hybrid'] as const;
export const KEY_RESULT_STATUSES = ['active', 'at_risk', 'done', 'archived'] as const;
export const CHECK_IN_CONFIDENCE = ['low', 'medium', 'high'] as const;

export type PeriodType = typeof PERIOD_TYPES[number];
export type PeriodStatus = typeof PERIOD_STATUSES[number];
export type ObjectiveStatus = typeof OBJECTIVE_STATUSES[number];
export type KeyResultType = typeof KEY_RESULT_TYPES[number];
export type KeyResultStatus = typeof KEY_RESULT_STATUSES[number];
export type CheckInConfidence = typeof CHECK_IN_CONFIDENCE[number];

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
  type: KeyResultType;
  targetValue?: number | null;
  currentValue?: number | null;
  unit?: string | null;
  status?: KeyResultStatus;
  confidence?: CheckInConfidence | null;
};

export type CheckInWriteInput = {
  keyResultId: string;
  progressValue?: number | null;
  confidence: CheckInConfidence;
  summary?: string | null;
  blockers?: string | null;
  nextActions?: string | null;
};

function ensureTrimmed(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field} is required.`);
  }

  return normalized;
}

function validateInSet<T extends string>(value: T, allowed: readonly T[], field: string) {
  if (!allowed.includes(value)) {
    throw new Error(`Unsupported ${field}: ${value}`);
  }

  return value;
}

function validateDateRange(startDate: string, endDate: string) {
  if (endDate < startDate) {
    throw new Error('End date must be on or after start date.');
  }
}

function normalizePeriodInput(input: PeriodWriteInput) {
  const name = ensureTrimmed(input.name, 'Period name');
  const type = validateInSet(input.type, PERIOD_TYPES, 'period type');
  const status = validateInSet(input.status ?? 'active', PERIOD_STATUSES, 'period status');
  validateDateRange(input.startDate, input.endDate);

  return {
    name,
    type,
    startDate: input.startDate,
    endDate: input.endDate,
    status,
  };
}

function normalizeObjectiveInput(input: ObjectiveWriteInput) {
  return {
    periodId: input.periodId,
    title: ensureTrimmed(input.title, 'Objective title'),
    description: input.description?.trim() || null,
    status: validateInSet(input.status ?? 'active', OBJECTIVE_STATUSES, 'objective status'),
    sortOrder: input.sortOrder ?? 0,
  };
}

function normalizeKeyResultInput(input: KeyResultWriteInput) {
  return {
    objectiveId: input.objectiveId,
    title: ensureTrimmed(input.title, 'Key result title'),
    type: validateInSet(input.type, KEY_RESULT_TYPES, 'key result type'),
    targetValue: input.targetValue ?? null,
    currentValue: input.currentValue ?? null,
    unit: input.unit?.trim() || null,
    status: validateInSet(input.status ?? 'active', KEY_RESULT_STATUSES, 'key result status'),
    confidence: input.confidence === undefined || input.confidence === null
      ? null
      : validateInSet(input.confidence, CHECK_IN_CONFIDENCE, 'check-in confidence'),
  };
}

function normalizeCheckInInput(input: CheckInWriteInput) {
  return {
    keyResultId: input.keyResultId,
    progressValue: input.progressValue ?? null,
    confidence: validateInSet(input.confidence, CHECK_IN_CONFIDENCE, 'check-in confidence'),
    summary: input.summary?.trim() || null,
    blockers: input.blockers?.trim() || null,
    nextActions: input.nextActions?.trim() || null,
  };
}

export async function listPeriods() {
  return db.query.periods.findMany({
    orderBy: [desc(schema.periods.startDate), desc(schema.periods.createdAt)],
    with: {
      objectives: {
        with: {
          keyResults: true,
        },
      },
    },
  });
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
          keyResults: true,
        },
      },
    },
  });

  if (active) {
    return active;
  }

  return db.query.periods.findFirst({
    where: eq(schema.periods.status, 'active'),
    orderBy: [desc(schema.periods.startDate)],
    with: {
      objectives: {
        with: {
          keyResults: true,
        },
      },
    },
  });
}

export async function getPeriod(periodId: string) {
  return db.query.periods.findFirst({
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
}

export async function createPeriod(input: PeriodWriteInput) {
  const normalized = normalizePeriodInput(input);
  const [period] = await db.insert(schema.periods).values(normalized).returning();
  return period;
}

export async function updatePeriod(
  periodId: string,
  input: Partial<PeriodWriteInput>,
) {
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

  if (input.name !== undefined) patch.name = ensureTrimmed(input.name, 'Period name');
  if (input.type !== undefined) patch.type = validateInSet(input.type, PERIOD_TYPES, 'period type');
  if (input.startDate !== undefined) patch.startDate = input.startDate;
  if (input.endDate !== undefined) patch.endDate = input.endDate;
  if (input.status !== undefined) patch.status = validateInSet(input.status, PERIOD_STATUSES, 'period status');
  if (patch.startDate && patch.endDate) validateDateRange(patch.startDate, patch.endDate);

  const [period] = await db
    .update(schema.periods)
    .set(patch)
    .where(eq(schema.periods.id, periodId))
    .returning();

  return period ?? null;
}

export async function archivePeriod(periodId: string) {
  return updatePeriod(periodId, { status: 'archived' });
}

export async function listObjectives(periodId: string) {
  return db.query.objectives.findMany({
    where: eq(schema.objectives.periodId, periodId),
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
}

export async function createObjective(input: ObjectiveWriteInput) {
  const normalized = normalizeObjectiveInput(input);
  const [objective] = await db.insert(schema.objectives).values(normalized).returning();
  return objective;
}

export async function updateObjective(
  objectiveId: string,
  input: Partial<ObjectiveWriteInput>,
) {
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

export async function createKeyResult(input: KeyResultWriteInput) {
  const normalized = normalizeKeyResultInput(input);
  const [keyResult] = await db.insert(schema.keyResults).values(normalized).returning();
  return keyResult;
}

export async function updateKeyResult(
  keyResultId: string,
  input: Partial<KeyResultWriteInput>,
) {
  const patch = {
    updatedAt: new Date(),
  } as {
    title?: string;
    type?: KeyResultType;
    targetValue?: number | null;
    currentValue?: number | null;
    unit?: string | null;
    status?: KeyResultStatus;
    confidence?: CheckInConfidence | null;
    updatedAt: Date;
  };

  if (input.title !== undefined) patch.title = ensureTrimmed(input.title, 'Key result title');
  if (input.type !== undefined) patch.type = validateInSet(input.type, KEY_RESULT_TYPES, 'key result type');
  if (input.targetValue !== undefined) patch.targetValue = input.targetValue ?? null;
  if (input.currentValue !== undefined) patch.currentValue = input.currentValue ?? null;
  if (input.unit !== undefined) patch.unit = input.unit?.trim() || null;
  if (input.status !== undefined) patch.status = validateInSet(input.status, KEY_RESULT_STATUSES, 'key result status');
  if (input.confidence !== undefined) {
    patch.confidence = input.confidence === null
      ? null
      : validateInSet(input.confidence, CHECK_IN_CONFIDENCE, 'check-in confidence');
  }

  const [keyResult] = await db
    .update(schema.keyResults)
    .set(patch)
    .where(eq(schema.keyResults.id, keyResultId))
    .returning();

  return keyResult ?? null;
}

export async function createKrCheckIn(input: CheckInWriteInput) {
  const normalized = normalizeCheckInInput(input);

  return db.transaction(async (tx: TransactionLike) => {
    const [checkIn] = await tx.insert(schema.krCheckIns).values(normalized).returning();

    await tx
      .update(schema.keyResults)
      .set({
        currentValue: normalized.progressValue,
        confidence: normalized.confidence,
        updatedAt: new Date(),
      })
      .where(eq(schema.keyResults.id, normalized.keyResultId));

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

  return {
    keyResultId,
    hasCheckIn: Boolean(latestCheckIn),
    progressValue: latestCheckIn?.progressValue ?? null,
    confidence: latestCheckIn?.confidence ?? null,
    summary: latestCheckIn?.summary ?? null,
    blockers: latestCheckIn?.blockers ?? null,
    nextActions: latestCheckIn?.nextActions ?? null,
    updatedAt: latestCheckIn?.createdAt ?? null,
    fallbackCurrentValue: keyResult.currentValue,
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

  return keyResults.filter((keyResult: { status: string; checkIns: Array<{ confidence: string; createdAt: Date }> }) => {
    const latest = keyResult.checkIns[0];
    return keyResult.status === 'at_risk'
      || latest?.confidence === 'low'
      || !latest
      || latest.createdAt < staleSince;
  });
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
  };
}

export async function listKeyResultsWithoutCheckIns() {
  return db.query.keyResults.findMany({
    where: isNull(schema.keyResults.confidence),
    orderBy: [asc(schema.keyResults.createdAt)],
  });
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

  return db.query.keyResults.findMany({
    where: inArray(schema.keyResults.id, keyResultIds),
    orderBy: [asc(schema.keyResults.createdAt)],
    with: {
      objective: true,
      checkIns: {
        orderBy: [desc(schema.krCheckIns.createdAt)],
      },
    },
  });
}
