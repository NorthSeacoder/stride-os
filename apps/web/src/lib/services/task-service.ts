import { and, asc, desc, eq, inArray, isNotNull, ne, notInArray } from 'drizzle-orm';
import { db, schema } from '@stride-os/db';

type TransactionLike = {
  query: typeof db.query;
  insert: typeof db.insert;
  delete: typeof db.delete;
};

export const TASK_STATUSES = ['inbox', 'today', 'scheduled', 'done', 'canceled'] as const;
export const TODAY_TYPES = ['must', 'focus'] as const;
export const TASK_PRIORITIES = ['P1', 'P2', 'P3'] as const;
export const TASK_ENERGIES = ['low', 'medium', 'high'] as const;

export type TaskStatus = typeof TASK_STATUSES[number];
export type TodayType = typeof TODAY_TYPES[number];
export type TaskPriority = typeof TASK_PRIORITIES[number];
export type TaskEnergy = typeof TASK_ENERGIES[number];

export type TaskWriteInput = {
  title: string;
  notes?: string | null;
  status?: TaskStatus;
  todayType?: TodayType | null;
  scheduledDate?: string | null;
  dueDate?: string | null;
  important?: boolean;
  urgent?: boolean;
  priority?: TaskPriority | null;
  energy?: TaskEnergy | null;
  completedAt?: Date | null;
};

export type TodayTaskGroups = {
  must: Awaited<ReturnType<typeof listTodayTasks>>['must'];
  focus: Awaited<ReturnType<typeof listTodayTasks>>['focus'];
};

function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}

function isTodayType(value: string): value is TodayType {
  return TODAY_TYPES.includes(value as TodayType);
}

function isTaskPriority(value: string): value is TaskPriority {
  return TASK_PRIORITIES.includes(value as TaskPriority);
}

function isTaskEnergy(value: string): value is TaskEnergy {
  return TASK_ENERGIES.includes(value as TaskEnergy);
}

function requireNonEmptyTitle(title: string) {
  const normalized = title.trim();
  if (!normalized) {
    throw new Error('任务标题不能为空。');
  }

  return normalized;
}

function normalizeTaskState(input: TaskWriteInput) {
  const status = input.status ?? 'inbox';
  if (!isTaskStatus(status)) {
    throw new Error(`任务状态不支持值：${status}`);
  }

  const todayType = input.todayType ?? null;
  if (todayType !== null && !isTodayType(todayType)) {
    throw new Error(`今日类型不支持值：${todayType}`);
  }

  const priority = input.priority ?? null;
  if (priority !== null && !isTaskPriority(priority)) {
    throw new Error(`任务优先级不支持值：${priority}`);
  }

  const energy = input.energy ?? null;
  if (energy !== null && !isTaskEnergy(energy)) {
    throw new Error(`任务精力消耗不支持值：${energy}`);
  }

  const normalized = {
    title: requireNonEmptyTitle(input.title),
    notes: input.notes?.trim() || null,
    status,
    todayType,
    scheduledDate: input.scheduledDate ?? null,
    dueDate: input.dueDate ?? null,
    completedAt: input.completedAt ?? null,
    important: input.important ?? false,
    urgent: input.urgent ?? false,
    priority,
    energy,
  };

  if (normalized.status === 'today' && normalized.todayType === null) {
    throw new Error('今日任务必须指定为“必做”或“专注”。');
  }

  if (normalized.status !== 'today') {
    normalized.todayType = null;
  }

  if (normalized.status === 'scheduled' && !normalized.scheduledDate) {
    throw new Error('排期任务必须填写排期日期。');
  }

  if (normalized.status === 'done' && normalized.completedAt === null) {
    normalized.completedAt = new Date();
  }

  if (normalized.status !== 'done') {
    normalized.completedAt = null;
  }

  return normalized;
}

export function buildTaskUpdatePatch(input: Partial<TaskWriteInput>) {
  const normalizedTitle = input.title?.trim();
  if (input.title !== undefined && !normalizedTitle) {
    throw new Error('任务标题不能为空。');
  }

  const rawStatus = input.status;
  if (rawStatus !== undefined && !isTaskStatus(rawStatus)) {
    throw new Error(`任务状态不支持值：${rawStatus}`);
  }

  const rawTodayType = input.todayType === undefined ? undefined : (input.todayType ?? null);
  if (rawTodayType !== undefined && rawTodayType !== null && !isTodayType(rawTodayType)) {
    throw new Error(`今日类型不支持值：${rawTodayType}`);
  }

  const rawPriority = input.priority === undefined ? undefined : (input.priority ?? null);
  if (rawPriority !== undefined && rawPriority !== null && !isTaskPriority(rawPriority)) {
    throw new Error(`任务优先级不支持值：${rawPriority}`);
  }

  const rawEnergy = input.energy === undefined ? undefined : (input.energy ?? null);
  if (rawEnergy !== undefined && rawEnergy !== null && !isTaskEnergy(rawEnergy)) {
    throw new Error(`任务精力消耗不支持值：${rawEnergy}`);
  }

  const patch: {
    title?: string;
    notes?: string | null;
    status?: TaskStatus;
    todayType?: TodayType | null;
    scheduledDate?: string | null;
    dueDate?: string | null;
    completedAt?: Date | null;
    important?: boolean;
    urgent?: boolean;
    priority?: TaskPriority | null;
    energy?: TaskEnergy | null;
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (normalizedTitle !== undefined) patch.title = normalizedTitle;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (rawStatus !== undefined) patch.status = rawStatus;
  if (rawTodayType !== undefined) patch.todayType = rawTodayType;
  if (input.scheduledDate !== undefined) patch.scheduledDate = input.scheduledDate ?? null;
  if (input.dueDate !== undefined) patch.dueDate = input.dueDate ?? null;
  if (input.completedAt !== undefined) patch.completedAt = input.completedAt ?? null;
  if (input.important !== undefined) patch.important = input.important;
  if (input.urgent !== undefined) patch.urgent = input.urgent;
  if (rawPriority !== undefined) patch.priority = rawPriority;
  if (rawEnergy !== undefined) patch.energy = rawEnergy;

  const nextStatus = patch.status;
  const nextTodayType = patch.todayType;

  if (nextStatus === 'today' && nextTodayType === undefined) {
    throw new Error('把任务移入“今日”时，必须指定为“必做”或“专注”。');
  }

  if (nextTodayType !== undefined && nextStatus !== 'today') {
    if (nextTodayType !== null) {
      throw new Error('只有状态为“今日”时，才能设置今日类型。');
    }
  }

  if (nextStatus === 'scheduled' && patch.scheduledDate === undefined) {
    throw new Error('把任务移入“已排期”时，必须填写排期日期。');
  }

  if (nextStatus === 'done' && patch.completedAt === undefined) {
    patch.completedAt = new Date();
  }

  if (nextStatus !== undefined && nextStatus !== 'done' && patch.completedAt === undefined) {
    patch.completedAt = null;
  }

  if (nextStatus !== undefined && nextStatus !== 'today' && patch.todayType === undefined) {
    patch.todayType = null;
  }

  return patch;
}

export async function listTodayTasks() {
  const items = await db.query.tasks.findMany({
    where: and(eq(schema.tasks.status, 'today'), isNotNull(schema.tasks.todayType)),
    orderBy: [asc(schema.tasks.todayType), desc(schema.tasks.important), desc(schema.tasks.urgent), asc(schema.tasks.createdAt)],
    with: {
      keyResultLinks: {
        with: {
          keyResult: true,
        },
      },
    },
  });

  return {
    must: items.filter((item: { todayType: string | null }) => item.todayType === 'must'),
    focus: items.filter((item: { todayType: string | null }) => item.todayType === 'focus'),
  };
}

export async function listInboxTasks() {
  return db.query.tasks.findMany({
    where: eq(schema.tasks.status, 'inbox'),
    orderBy: [desc(schema.tasks.important), desc(schema.tasks.urgent), asc(schema.tasks.createdAt)],
    with: {
      keyResultLinks: {
        with: {
          keyResult: true,
        },
      },
    },
  });
}

export async function listScheduledTasks() {
  return db.query.tasks.findMany({
    where: eq(schema.tasks.status, 'scheduled'),
    orderBy: [asc(schema.tasks.scheduledDate), desc(schema.tasks.important), asc(schema.tasks.createdAt)],
    with: {
      keyResultLinks: {
        with: {
          keyResult: true,
        },
      },
    },
  });
}

export async function listDoneTasks() {
  return db.query.tasks.findMany({
    where: eq(schema.tasks.status, 'done'),
    orderBy: [desc(schema.tasks.completedAt), desc(schema.tasks.updatedAt)],
    with: {
      keyResultLinks: {
        with: {
          keyResult: true,
        },
      },
    },
  });
}

export async function listQuadrantTasks(options?: { includeCompleted?: boolean }) {
  const where = options?.includeCompleted
    ? notInArray(schema.tasks.status, ['canceled'])
    : and(ne(schema.tasks.status, 'done'), ne(schema.tasks.status, 'canceled'));

  return db.query.tasks.findMany({
    where,
    orderBy: [desc(schema.tasks.important), desc(schema.tasks.urgent), asc(schema.tasks.createdAt)],
    with: {
      keyResultLinks: {
        with: {
          keyResult: true,
        },
      },
    },
  });
}

export async function getTask(taskId: string) {
  return db.query.tasks.findFirst({
    where: eq(schema.tasks.id, taskId),
    with: {
      keyResultLinks: {
        with: {
          keyResult: true,
        },
      },
    },
  });
}

export async function createTask(input: TaskWriteInput) {
  const normalized = normalizeTaskState(input);
  const [task] = await db.insert(schema.tasks).values(normalized).returning();
  return task;
}

export async function updateTask(taskId: string, input: Partial<TaskWriteInput>) {
  const patch = buildTaskUpdatePatch(input);
  const [task] = await db
    .update(schema.tasks)
    .set(patch)
    .where(eq(schema.tasks.id, taskId))
    .returning();

  return task ?? null;
}

export async function moveTaskToToday(taskId: string, todayType: TodayType) {
  return updateTask(taskId, {
    status: 'today',
    todayType,
    scheduledDate: null,
  });
}

export async function scheduleTask(taskId: string, scheduledDate: string) {
  return updateTask(taskId, {
    status: 'scheduled',
    scheduledDate,
  });
}

export async function completeTask(taskId: string) {
  return updateTask(taskId, {
    status: 'done',
  });
}

export async function cancelTask(taskId: string) {
  return updateTask(taskId, {
    status: 'canceled',
  });
}

export async function updateTaskQuadrant(
  taskId: string,
  input: { important: boolean; urgent: boolean },
) {
  const [task] = await db
    .update(schema.tasks)
    .set({
      important: input.important,
      urgent: input.urgent,
      updatedAt: new Date(),
    })
    .where(eq(schema.tasks.id, taskId))
    .returning();

  return task ?? null;
}

export async function listTasksForKeyResult(keyResultId: string) {
  const links = await db.query.taskKrLinks.findMany({
    where: eq(schema.taskKrLinks.keyResultId, keyResultId),
    orderBy: [desc(schema.taskKrLinks.createdAt)],
    with: {
      task: true,
    },
  });

  return links.map((link: { task: unknown }) => link.task);
}

export async function replaceTaskKeyResultLinks(taskId: string, keyResultIds: string[]) {
  const dedupedIds = Array.from(new Set(keyResultIds));

  return db.transaction(async (tx: TransactionLike) => {
    await tx.delete(schema.taskKrLinks).where(eq(schema.taskKrLinks.taskId, taskId));

    if (dedupedIds.length > 0) {
      await tx.insert(schema.taskKrLinks).values(
        dedupedIds.map((keyResultId) => ({
          taskId,
          keyResultId,
        })),
      );
    }

    if (dedupedIds.length === 0) {
      return [];
    }

    return tx.query.taskKrLinks.findMany({
      where: and(eq(schema.taskKrLinks.taskId, taskId), inArray(schema.taskKrLinks.keyResultId, dedupedIds)),
      with: {
        keyResult: true,
      },
    });
  });
}

export async function unlinkTaskFromAllKeyResults(taskId: string) {
  await db.delete(schema.taskKrLinks).where(eq(schema.taskKrLinks.taskId, taskId));
}

export async function countOpenMustTasks() {
  const tasks = await db.query.tasks.findMany({
    where: and(eq(schema.tasks.status, 'today'), eq(schema.tasks.todayType, 'must')),
  });

  return tasks.length;
}

export async function listCompletedTasksBetween(periodStart: string, periodEnd: string) {
  return db.query.tasks.findMany({
    where: and(
      eq(schema.tasks.status, 'done'),
      isNotNull(schema.tasks.completedAt),
    ),
    orderBy: [desc(schema.tasks.completedAt)],
    with: {
      keyResultLinks: {
        with: {
          keyResult: true,
        },
      },
    },
  }).then((items: Array<{ completedAt: Date | null }>) => items.filter((item: { completedAt: Date | null }) => {
    if (!item.completedAt) {
      return false;
    }

    const completed = item.completedAt.toISOString().slice(0, 10);
    return completed >= periodStart && completed <= periodEnd;
  }));
}

export async function listOpenMustTasks() {
  return db.query.tasks.findMany({
    where: and(eq(schema.tasks.status, 'today'), eq(schema.tasks.todayType, 'must')),
    orderBy: [desc(schema.tasks.important), desc(schema.tasks.urgent), asc(schema.tasks.createdAt)],
  });
}

export async function listTasksByIds(taskIds: string[]) {
  if (taskIds.length === 0) {
    return [];
  }

  return db.query.tasks.findMany({
    where: inArray(schema.tasks.id, taskIds),
    orderBy: [asc(schema.tasks.createdAt)],
  });
}

export async function listCanceledTasks() {
  return db.query.tasks.findMany({
    where: eq(schema.tasks.status, 'canceled'),
    orderBy: [desc(schema.tasks.updatedAt)],
  });
}

export async function listTasksWithoutKeyResults() {
  const linked = await db.query.taskKrLinks.findMany({
    columns: {
      taskId: true,
    },
  });

  const linkedIds: string[] = Array.from(new Set(linked.map((item: { taskId: string }) => item.taskId)));
  return db.query.tasks.findMany({
    where: linkedIds.length > 0
      ? and(ne(schema.tasks.status, 'canceled'), notInArray(schema.tasks.id, linkedIds))
      : ne(schema.tasks.status, 'canceled'),
    orderBy: [asc(schema.tasks.createdAt)],
  });
}

export async function listTasksCompletedForKeyResults(keyResultIds: string[]) {
  if (keyResultIds.length === 0) {
    return [];
  }

  const links = await db.query.taskKrLinks.findMany({
    where: inArray(schema.taskKrLinks.keyResultId, keyResultIds),
    with: {
      task: true,
      keyResult: true,
    },
  });

  return links.filter((link: { task: { status: string } }) => link.task.status === 'done');
}

export async function listTasksDueSoon(fromDate: string, toDate: string) {
  return db.query.tasks.findMany({
    where: and(isNotNull(schema.tasks.dueDate), ne(schema.tasks.status, 'done'), ne(schema.tasks.status, 'canceled')),
    orderBy: [asc(schema.tasks.dueDate), desc(schema.tasks.important)],
  }).then((items: Array<{ dueDate: string | null }>) =>
    items.filter((item: { dueDate: string | null }) => item.dueDate !== null && item.dueDate >= fromDate && item.dueDate <= toDate),
  );
}

export async function hasTaskLinksForKeyResult(keyResultId: string) {
  const link = await db.query.taskKrLinks.findFirst({
    where: eq(schema.taskKrLinks.keyResultId, keyResultId),
  });

  return Boolean(link);
}

export async function listTasksForReviewPeriod(periodStart: string, periodEnd: string) {
  const [completedTasks, openMustTasks] = await Promise.all([
    listCompletedTasksBetween(periodStart, periodEnd),
    listOpenMustTasks(),
  ]);

  return {
    completedTasks,
    openMustTasks,
  };
}

export async function clearTaskTodayState(taskId: string) {
  const [task] = await db
    .update(schema.tasks)
    .set({
      status: 'inbox',
      todayType: null,
      scheduledDate: null,
      completedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.tasks.id, taskId))
    .returning();

  return task ?? null;
}

export async function listTodayTaskCounts() {
  const { must, focus } = await listTodayTasks();
  return {
    mustCount: must.length,
    focusCount: focus.length,
  };
}

export async function getTaskLinkKeyResultIds(taskId: string) {
  const links = await db.query.taskKrLinks.findMany({
    where: eq(schema.taskKrLinks.taskId, taskId),
    orderBy: [asc(schema.taskKrLinks.createdAt)],
  });

  return links.map((link: { keyResultId: string }) => link.keyResultId);
}
