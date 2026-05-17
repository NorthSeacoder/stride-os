import { and, asc, desc, eq, inArray, isNotNull, isNull, ne, notInArray } from 'drizzle-orm';
import { db, schema } from '@stride-os/db';
import {
  buildActivityDiff,
  recordActivity,
  type ActivityContext,
  type ActivityMetadata,
} from './activity-service';

type TransactionLike = {
  query: typeof db.query;
  insert: typeof db.insert;
  delete: typeof db.delete;
  update: typeof db.update;
};

export type TaskDashboardCounts = {
  inboxCount: number;
  dueTodayCount: number;
  dueTomorrowCount: number;
  overdueCount: number;
  completedCount: number;
  dueSoonCount?: number;
};

export const TASK_PRIORITIES = ['P1', 'P2', 'P3'] as const;
export const TASK_ENERGIES = ['low', 'medium', 'high'] as const;

export type TaskPriority = typeof TASK_PRIORITIES[number];
export type TaskEnergy = typeof TASK_ENERGIES[number];

export type TaskWriteInput = {
  title: string;
  notes?: string | null;
  description?: string | null;
  listId?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority | null;
  energy?: TaskEnergy | null;
  completedAt?: Date | null;
};

export const QUADRANT_KEYS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
export type TaskQuadrantKey = typeof QUADRANT_KEYS[number];
export type TaskUrgencyBand = 'high' | 'low';
export type TaskImportanceBand = 'high' | 'low';

export const TASK_SMART_SOURCE_IDS = ['all', 'today', 'tomorrow', 'inbox', 'next-7-days'] as const;
export type TaskSmartSourceId = typeof TASK_SMART_SOURCE_IDS[number];
export type TaskSourceId = TaskSmartSourceId | `list:${string}`;
export type TaskGroupKey = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'no-date' | 'completed';

export type TaskWorkspaceTask = Awaited<ReturnType<typeof getTask>>;
export type TaskListSummary = {
  id: string;
  name: string;
  icon: string | null;
  kind: string;
  slug: string;
  taskCount: number;
};

export type TaskSourceSummary = {
  id: TaskSourceId;
  kind: 'smart' | 'list';
  title: string;
  count: number;
  icon: string;
  listId?: string;
};

export type TaskGroup = {
  key: TaskGroupKey;
  title: string;
  items: TaskWorkspaceTask[];
};

export const TASK_DEFINITION_FREQUENCIES = ['daily', 'weekly', 'monthly', 'weekdays', 'weekends'] as const;
export const TASK_DEFINITION_END_TYPES = ['never', 'until_date', 'after_count'] as const;

export type TaskDefinitionFrequency = typeof TASK_DEFINITION_FREQUENCIES[number];
export type TaskDefinitionEndType = typeof TASK_DEFINITION_END_TYPES[number];

export type TaskDefinitionWriteInput = {
  title: string;
  description?: string | null;
  listId: string;
  frequency: TaskDefinitionFrequency;
  endType: TaskDefinitionEndType;
  endDate?: string | null;
  occurrenceCount?: number | null;
};

export type QuadrantListGroup = {
  listId: string;
  listName: string;
  listIcon: string | null;
  items: TaskWorkspaceTask[];
};

export type QuadrantSection = {
  key: TaskQuadrantKey;
  title: string;
  groups: QuadrantListGroup[];
  completedGroups: QuadrantListGroup[];
  totalCount: number;
  openCount: number;
  completedCount: number;
};

export type TaskDefinitionDetail = Awaited<ReturnType<typeof getTaskDefinitionDetail>>;

const TASK_GROUP_ORDER: TaskGroupKey[] = ['overdue', 'today', 'tomorrow', 'upcoming', 'no-date', 'completed'];
const TASK_GROUP_TITLES: Record<TaskGroupKey, string> = {
  overdue: '已过期',
  today: '今天',
  tomorrow: '明天',
  upcoming: '未来',
  'no-date': '无日期',
  completed: '已完成',
};
const TASK_SOURCE_ICONS: Record<TaskSmartSourceId, string> = {
  all: 'layers',
  today: 'sun',
  tomorrow: 'calendar-plus',
  inbox: 'inbox',
  'next-7-days': 'calendar-range',
};
const QUADRANT_TITLES: Record<TaskQuadrantKey, string> = {
  Q1: '重要且紧急',
  Q2: '重要不紧急',
  Q3: '不重要但紧急',
  Q4: '不重要不紧急',
};

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function parseDateOnlyInput(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
}

function toDateOnlyDate(value: Date | string) {
  return typeof value === 'string' ? parseDateOnlyInput(value) : parseDateOnlyInput(formatDateOnly(value));
}

function normalizeDateValue(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return typeof value === 'string' ? value : formatDateOnly(value);
}

export function getCalendarDayDelta(
  dueDate: Date | string | null | undefined,
  today: Date | string = new Date(),
) {
  const normalizedDueDate = normalizeDateValue(dueDate);
  if (!normalizedDueDate) {
    return null;
  }

  const due = toDateOnlyDate(normalizedDueDate);
  const current = toDateOnlyDate(typeof today === 'string' ? today : formatDateOnly(today));
  return Math.round((due.getTime() - current.getTime()) / (24 * 60 * 60 * 1000));
}

export function getTaskUrgencyBand(
  dueDate: Date | string | null | undefined,
  today: Date | string = new Date(),
): TaskUrgencyBand | null {
  const delta = getCalendarDayDelta(dueDate, today);
  if (delta === null) {
    return null;
  }

  return delta <= 7 ? 'high' : 'low';
}

export function getTaskImportanceBand(priority: TaskPriority | null | undefined): TaskImportanceBand {
  return priority === 'P1' || priority === 'P2' ? 'high' : 'low';
}

export function getTaskQuadrant(
  input: { priority?: TaskPriority | null; dueDate?: Date | string | null },
  today: Date | string = new Date(),
): TaskQuadrantKey {
  const priority = input.priority ?? null;
  const urgency = getTaskUrgencyBand(input.dueDate, today);

  if (urgency === null) {
    if (priority === 'P1') return 'Q1';
    if (priority === 'P2') return 'Q2';
    if (priority === 'P3') return 'Q3';
    return 'Q4';
  }

  const importance = getTaskImportanceBand(priority);
  if (importance === 'high' && urgency === 'high') return 'Q1';
  if (importance === 'high' && urgency === 'low') return 'Q2';
  if (importance === 'low' && urgency === 'high') return 'Q3';
  return 'Q4';
}

export function buildQuadrantDefaults(
  quadrant: TaskQuadrantKey,
  today: Date | string = new Date(),
) {
  const anchor = typeof today === 'string' ? today : formatDateOnly(today);
  const lowUrgencyDate = formatDateOnly(addDays(toDateOnlyDate(anchor), 8));

  if (quadrant === 'Q1') {
    return { priority: 'P1' as TaskPriority, dueDate: anchor };
  }

  if (quadrant === 'Q2') {
    return { priority: 'P2' as TaskPriority, dueDate: lowUrgencyDate };
  }

  if (quadrant === 'Q3') {
    return { priority: 'P3' as TaskPriority, dueDate: anchor };
  }

  return { priority: null, dueDate: lowUrgencyDate };
}

function buildTaskListSourceId(listId: string): TaskSourceId {
  return `list:${listId}`;
}

function parseTaskListSourceId(sourceId: TaskSourceId) {
  return sourceId.startsWith('list:') ? sourceId.slice(5) : null;
}

function isCompletedTask(task: { completedAt?: Date | string | null; status?: string | null }) {
  return Boolean(task.completedAt) || task.status === 'done';
}

function getTaskTemporalGroup(task: { dueDate?: Date | string | null; completedAt?: Date | string | null; status?: string | null }, today: string, tomorrow: string) {
  if (isCompletedTask(task)) {
    return 'completed' as const;
  }

  const dueDate = normalizeDateValue(task.dueDate);
  if (!dueDate) {
    return 'no-date' as const;
  }

  if (dueDate < today) {
    return 'overdue' as const;
  }

  if (dueDate === today) {
    return 'today' as const;
  }

  if (dueDate === tomorrow) {
    return 'tomorrow' as const;
  }

  return 'upcoming' as const;
}

function filterTasksBySource(tasks: TaskWorkspaceTask[], sourceId: TaskSourceId, today: string, tomorrow: string, next7End: string) {
  const listId = parseTaskListSourceId(sourceId);
  if (listId) {
    return tasks.filter((task) => task?.listId === listId);
  }

  if (sourceId === 'all') {
    return tasks;
  }

  if (sourceId === 'inbox') {
    return tasks.filter((task) => task?.list?.slug === 'inbox');
  }

  return tasks.filter((task) => {
    const dueDate = normalizeDateValue(task?.dueDate);
    if (!dueDate) {
      return false;
    }

    if (sourceId === 'today') {
      return dueDate === today;
    }

    if (sourceId === 'tomorrow') {
      return dueDate === tomorrow;
    }

    return dueDate >= today && dueDate <= next7End;
  });
}

function groupTasksForWorkspace(tasks: TaskWorkspaceTask[], today: string, tomorrow: string) {
  const grouped = TASK_GROUP_ORDER.reduce<Record<TaskGroupKey, TaskWorkspaceTask[]>>((acc, key) => {
    acc[key] = [];
    return acc;
  }, {
    overdue: [],
    today: [],
    tomorrow: [],
    upcoming: [],
    'no-date': [],
    completed: [],
  });

  for (const task of tasks) {
    grouped[getTaskTemporalGroup(task ?? {}, today, tomorrow)].push(task);
  }

  return TASK_GROUP_ORDER.map((key) => ({
    key,
    title: TASK_GROUP_TITLES[key],
    items: grouped[key],
  }));
}

function isTaskPriority(value: string): value is TaskPriority {
  return TASK_PRIORITIES.includes(value as TaskPriority);
}

function isTaskEnergy(value: string): value is TaskEnergy {
  return TASK_ENERGIES.includes(value as TaskEnergy);
}

function isTaskDefinitionFrequency(value: string): value is TaskDefinitionFrequency {
  return TASK_DEFINITION_FREQUENCIES.includes(value as TaskDefinitionFrequency);
}

function isTaskDefinitionEndType(value: string): value is TaskDefinitionEndType {
  return TASK_DEFINITION_END_TYPES.includes(value as TaskDefinitionEndType);
}

function requireNonEmptyTitle(title: string) {
  const normalized = title.trim();
  if (!normalized) {
    throw new Error('任务标题不能为空。');
  }

  return normalized;
}

function normalizeTaskDefinitionInput(input: TaskDefinitionWriteInput) {
  const title = requireNonEmptyTitle(input.title);
  const frequency = input.frequency;
  const endType = input.endType;

  if (!isTaskDefinitionFrequency(frequency)) {
    throw new Error(`重复频率不支持值：${frequency}`);
  }

  if (!isTaskDefinitionEndType(endType)) {
    throw new Error(`重复结束方式不支持值：${endType}`);
  }

  const occurrenceCount = input.occurrenceCount ?? null;
  const endDate = input.endDate ?? null;

  if (endType === 'until_date' && !endDate) {
    throw new Error('按结束日期重复时，必须填写结束日期。');
  }

  if (endType === 'after_count' && (!occurrenceCount || occurrenceCount <= 0)) {
    throw new Error('按重复次数结束时，必须填写大于 0 的次数。');
  }

  if (endType === 'never') {
    return {
      title,
      description: input.description?.trim() || null,
      listId: input.listId,
      frequency,
      endType,
      endDate: null,
      occurrenceCount: null,
    };
  }

  return {
    title,
    description: input.description?.trim() || null,
    listId: input.listId,
    frequency,
    endType,
    endDate,
    occurrenceCount: endType === 'after_count' ? occurrenceCount : null,
  };
}

function normalizeTaskState(input: TaskWriteInput) {
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
    description: input.description?.trim() || null,
    status: input.completedAt ? 'done' : 'inbox',
    listId: input.listId ?? null,
    dueDate: input.dueDate ?? null,
    completedAt: input.completedAt ?? null,
    priority,
    energy,
  };

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
    description?: string | null;
    status?: 'inbox' | 'done';
    listId?: string | null;
    dueDate?: string | null;
    completedAt?: Date | null;
    priority?: TaskPriority | null;
    energy?: TaskEnergy | null;
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (normalizedTitle !== undefined) patch.title = normalizedTitle;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  if (input.listId !== undefined) patch.listId = input.listId ?? null;
  if (input.dueDate !== undefined) patch.dueDate = input.dueDate ?? null;
  if (input.completedAt !== undefined) {
    patch.completedAt = input.completedAt ?? null;
  }
  if (rawPriority !== undefined) patch.priority = rawPriority;
  if (rawEnergy !== undefined) patch.energy = rawEnergy;

  return patch;
}

export async function listQuadrantTasks(options?: { includeCompleted?: boolean }) {
  const where = options?.includeCompleted
    ? isNull(schema.tasks.archivedAt)
    : and(ne(schema.tasks.status, 'done'), isNull(schema.tasks.archivedAt));

  return db.query.tasks.findMany({
    where,
    orderBy: [asc(schema.tasks.dueDate), asc(schema.tasks.createdAt)],
    with: {
      keyResultLinks: {
        with: {
          keyResult: true,
        },
      },
    },
  });
}

function getQuadrantGroupListInfo(task: TaskWorkspaceTask & { list?: { id?: string; name?: string; icon?: string | null } | null }) {
  if (task.list?.id && task.list?.name) {
    return {
      listId: task.list.id,
      listName: task.list.name,
      listIcon: task.list.icon ?? null,
    };
  }

  return {
    listId: task.listId ?? 'unassigned',
    listName: '未分组',
    listIcon: null,
  };
}

function buildQuadrantGroups(tasks: Array<TaskWorkspaceTask & { list?: { id?: string; name?: string; icon?: string | null } | null }>) {
  const groups = new Map<string, QuadrantListGroup>();

  for (const task of tasks) {
    const listInfo = getQuadrantGroupListInfo(task);
    const existing = groups.get(listInfo.listId);
    if (existing) {
      existing.items.push(task);
      continue;
    }

    groups.set(listInfo.listId, {
      ...listInfo,
      items: [task],
    });
  }

  return Array.from(groups.values()).sort((a, b) => a.listName.localeCompare(b.listName, 'zh-CN'));
}

export async function listQuadrantBoard(options?: { includeCompleted?: boolean; today?: string }) {
  const today = options?.today ?? formatDateOnly(new Date());
  const items = await db.query.tasks.findMany({
    where: isNull(schema.tasks.archivedAt),
    orderBy: [asc(schema.tasks.dueDate), asc(schema.tasks.createdAt)],
    with: {
      list: true,
      keyResultLinks: {
        with: {
          keyResult: true,
        },
      },
    },
  }) as Array<TaskWorkspaceTask & { list?: { id?: string; name?: string; icon?: string | null } | null }>;

  const openByQuadrant = new Map<TaskQuadrantKey, Array<TaskWorkspaceTask & { list?: { id?: string; name?: string; icon?: string | null } | null }>>();
  const completedByQuadrant = new Map<TaskQuadrantKey, Array<TaskWorkspaceTask & { list?: { id?: string; name?: string; icon?: string | null } | null }>>();

  for (const quadrant of QUADRANT_KEYS) {
    openByQuadrant.set(quadrant, []);
    completedByQuadrant.set(quadrant, []);
  }

  for (const task of items) {
    const quadrant = getTaskQuadrant(task, today);
    if (isCompletedTask(task)) {
      completedByQuadrant.get(quadrant)?.push(task);
      continue;
    }

    openByQuadrant.get(quadrant)?.push(task);
  }

  const quadrants: QuadrantSection[] = QUADRANT_KEYS.map((quadrant) => {
    const openItems = openByQuadrant.get(quadrant) ?? [];
    const completedItems = completedByQuadrant.get(quadrant) ?? [];

    return {
      key: quadrant,
      title: QUADRANT_TITLES[quadrant],
      groups: buildQuadrantGroups(openItems),
      completedGroups: options?.includeCompleted === false ? [] : buildQuadrantGroups(completedItems),
      totalCount: openItems.length + completedItems.length,
      openCount: openItems.length,
      completedCount: completedItems.length,
    };
  });

  return {
    today,
    quadrants,
  };
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

export async function createTask(input: TaskWriteInput, _options?: TaskMutationOptions) {
  const normalized = normalizeTaskState(input);
  const [task] = await db.insert(schema.tasks).values(normalized).returning();
  if (task) {
    await recordTaskChangeActivity(null, task, _options);
  }
  return task;
}

export type TaskMutationOptions = {
  activityContext?: ActivityContext;
  activityAction?: string;
  summary?: string;
};

export type TaskKeyResultLinkInput = {
  keyResultId: string;
  countsTowardCommitment?: boolean;
};

function toTaskActivitySnapshot(task: {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  priority: TaskPriority | null;
  listId: string | null;
  completedAt: Date | null;
}) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    dueDate: task.dueDate,
    priority: task.priority,
    listId: task.listId,
    completedAt: task.completedAt,
  };
}

function getTaskActivityAction(
  before: ReturnType<typeof toTaskActivitySnapshot> | null,
  after: ReturnType<typeof toTaskActivitySnapshot>,
  options?: TaskMutationOptions,
) {
  if (options?.activityAction) {
    return options.activityAction;
  }

  if (!before) {
    return 'task.create';
  }

  if (before.completedAt === null && after.completedAt !== null) {
    return 'task.complete';
  }

  if (before.completedAt !== null && after.completedAt === null) {
    return 'task.restore';
  }

  return 'task.update';
}

function getTaskActivitySummary(action: string, task: ReturnType<typeof toTaskActivitySnapshot>) {
  switch (action) {
    case 'task.create':
      return `Created task ${task.title}`;
    case 'task.complete':
      return `Completed task ${task.title}`;
    case 'task.restore':
      return `Restored task ${task.title}`;
    case 'task.archive':
      return `Archived task ${task.title}`;
    case 'task.move_quadrant':
      return `Moved task ${task.title} to a new quadrant`;
    case 'task.move_list':
      return `Moved task ${task.title} to a new list`;
    case 'task.link_key_result':
      return `Linked task ${task.title} to a key result`;
    case 'task.unlink_key_result':
      return `Unlinked task ${task.title} from a key result`;
    default:
      return `Updated task ${task.title}`;
  }
}

async function recordTaskActivity(
  task: ReturnType<typeof toTaskActivitySnapshot>,
  options: TaskMutationOptions | undefined,
  action: string,
  metadata?: ActivityMetadata | null,
) {
  if (!options?.activityContext) {
    return;
  }

  await recordActivity({
    actorType: options.activityContext.actorType,
    actorId: options.activityContext.actorId ?? null,
    action,
    targetType: 'task',
    targetId: task.id,
    targetTitle: task.title,
    source: options.activityContext.source,
    summary: options.summary ?? getTaskActivitySummary(action, task),
    metadata: {
      actorLabel: options.activityContext.actorLabel ?? undefined,
      sourceLabel: options.activityContext.sourceLabel ?? undefined,
      requestId: options.activityContext.requestId ?? undefined,
      command: options.activityContext.command ?? undefined,
      ...(metadata ?? {}),
    },
  });
}

async function recordTaskChangeActivity(
  before: {
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
    priority: TaskPriority | null;
    listId: string | null;
    completedAt: Date | null;
  } | null,
  after: {
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
    priority: TaskPriority | null;
    listId: string | null;
    completedAt: Date | null;
  },
  options?: TaskMutationOptions,
) {
  const beforeSnapshot = before ? toTaskActivitySnapshot(before) : null;
  const afterSnapshot = toTaskActivitySnapshot(after);
  const action = getTaskActivityAction(beforeSnapshot, afterSnapshot, options);
  const metadata = beforeSnapshot
    ? buildActivityDiff(beforeSnapshot, afterSnapshot, ['status', 'dueDate', 'priority', 'title', 'listId', 'completedAt'])
    : null;

  await recordTaskActivity(afterSnapshot, options, action, metadata);
}

export async function createTaskList(input: { name: string; icon?: string | null; kind?: 'system' | 'user'; slug?: string | null }) {
  const name = input.name.trim();
  if (!name) {
    throw new Error('清单名称不能为空。');
  }

  const slugBase = (input.slug?.trim() || name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || `list-${Date.now()}`;

  const [list] = await db.insert(schema.taskLists).values({
    name,
    icon: input.icon?.trim() || null,
    kind: input.kind ?? 'user',
    slug: `${slugBase}-${Date.now().toString(36)}`,
  }).returning();

  return list;
}

export async function updateTask(taskId: string, input: Partial<TaskWriteInput>, _options?: TaskMutationOptions) {
  const existing = await db.query.tasks.findFirst({
    where: eq(schema.tasks.id, taskId),
  });

  if (!existing) {
    return null;
  }

  const patch = buildTaskUpdatePatch(input);
  if (patch.completedAt !== undefined) {
    patch.status = patch.completedAt ? 'done' : 'inbox';
  }
  const [task] = await db
    .update(schema.tasks)
    .set(patch)
    .where(eq(schema.tasks.id, taskId))
    .returning();

  if (task) {
    await recordTaskChangeActivity(existing, task, _options);
  }

  return task ?? null;
}

export async function toggleTaskCompletion(taskId: string, completed: boolean, options?: TaskMutationOptions) {
  return updateTask(taskId, completed
    ? { completedAt: new Date() }
    : { completedAt: null }, options);
}

export async function completeTask(taskId: string, options?: TaskMutationOptions) {
  return updateTask(taskId, {
    completedAt: new Date(),
  }, options);
}

export async function archiveTask(taskId: string, _options?: TaskMutationOptions) {
  const existing = await db.query.tasks.findFirst({
    where: eq(schema.tasks.id, taskId),
  });

  if (!existing) {
    return null;
  }

  const [task] = await db
    .update(schema.tasks)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.tasks.id, taskId))
    .returning();

  if (task) {
    await recordTaskActivity(toTaskActivitySnapshot(task), _options, 'task.archive');
  }

  return task ?? null;
}

export async function moveTaskToQuadrant(taskId: string, quadrant: TaskQuadrantKey, today?: string, options?: TaskMutationOptions) {
  const defaults = buildQuadrantDefaults(quadrant, today ?? formatDateOnly(new Date()));
  return updateTask(taskId, {
    priority: defaults.priority,
    dueDate: defaults.dueDate,
  }, {
    ...options,
    activityAction: 'task.move_quadrant',
  });
}

export async function moveTaskToQuadrantList(taskId: string, listId: string | null, options?: TaskMutationOptions) {
  return updateTask(taskId, {
    listId,
  }, {
    ...options,
    activityAction: 'task.move_list',
  });
}

export async function listTasksForKeyResult(keyResultId: string) {
  const links = await db.query.taskKrLinks.findMany({
    where: eq(schema.taskKrLinks.keyResultId, keyResultId),
    orderBy: [desc(schema.taskKrLinks.createdAt)],
    with: {
      task: true,
    },
  });

  return links.map((link: {
    keyResultId: string;
    countsTowardCommitment?: boolean | null;
    committedAt?: Date | null;
    task: { keyResultLinks?: unknown[] };
  }) => ({
    ...link.task,
    keyResultLinks: [
      ...(link.task.keyResultLinks ?? []),
      {
        keyResultId: link.keyResultId,
        countsTowardCommitment: Boolean(link.countsTowardCommitment),
        committedAt: link.committedAt ?? null,
        keyResult: { id: link.keyResultId },
      },
    ],
  }));
}

export type KeyResultTaskProgressSnapshot = {
  keyResultId: string;
  committedTaskCount: number;
  completedCommittedTaskCount: number;
  openCommittedTaskCount: number;
  hasCommittedTasks: boolean;
  lastTaskProgressAt: Date | null;
};

export async function listTaskProgressSnapshotsForKeyResults(keyResultIds: string[]): Promise<KeyResultTaskProgressSnapshot[]> {
  if (keyResultIds.length === 0) {
    return [];
  }

  const uniqueIds = Array.from(new Set(keyResultIds));
  const links = await db.query.taskKrLinks.findMany({
    where: inArray(schema.taskKrLinks.keyResultId, uniqueIds),
    with: {
      task: true,
    },
  });

  const snapshotMap = new Map<string, KeyResultTaskProgressSnapshot>(
    uniqueIds.map((keyResultId) => [keyResultId, {
      keyResultId,
      committedTaskCount: 0,
      completedCommittedTaskCount: 0,
      openCommittedTaskCount: 0,
      hasCommittedTasks: false,
      lastTaskProgressAt: null,
    }]),
  );

  for (const link of links as Array<{
    keyResultId: string;
    countsTowardCommitment?: boolean | null;
    task: { archivedAt?: Date | string | null; status: string; completedAt?: Date | null; updatedAt?: Date | null };
  }>) {
    if (!link.countsTowardCommitment || link.task.archivedAt) {
      continue;
    }

    const snapshot = snapshotMap.get(link.keyResultId);
    if (!snapshot) continue;

    snapshot.committedTaskCount += 1;
    snapshot.hasCommittedTasks = true;
    if (link.task.status === 'done') {
      snapshot.completedCommittedTaskCount += 1;
    } else {
      snapshot.openCommittedTaskCount += 1;
    }

    const candidate = link.task.completedAt ?? link.task.updatedAt ?? null;
    if (candidate && (!snapshot.lastTaskProgressAt || candidate > snapshot.lastTaskProgressAt)) {
      snapshot.lastTaskProgressAt = candidate;
    }
  }

  return uniqueIds.map((keyResultId) => snapshotMap.get(keyResultId) as KeyResultTaskProgressSnapshot);
}

export async function getTaskProgressSnapshotForKeyResult(keyResultId: string): Promise<KeyResultTaskProgressSnapshot> {
  const [snapshot] = await listTaskProgressSnapshotsForKeyResults([keyResultId]);
  return snapshot ?? {
    keyResultId,
    committedTaskCount: 0,
    completedCommittedTaskCount: 0,
    openCommittedTaskCount: 0,
    hasCommittedTasks: false,
    lastTaskProgressAt: null,
  };
}

export async function replaceTaskKeyResultLinks(taskId: string, keyResultLinks: Array<string | TaskKeyResultLinkInput>, _options?: TaskMutationOptions) {
  const dedupedLinks = Array.from(new Map(
    keyResultLinks
      .map((item) => typeof item === 'string'
        ? { keyResultId: item, countsTowardCommitment: false }
        : { keyResultId: item.keyResultId, countsTowardCommitment: Boolean(item.countsTowardCommitment) })
      .filter((item) => item.keyResultId)
      .map((item) => [item.keyResultId, item]),
  ).values());
  const existingLinks = await db.query.taskKrLinks.findMany({
    where: eq(schema.taskKrLinks.taskId, taskId),
  });
  const task = _options?.activityContext
    ? await db.query.tasks.findFirst({
        where: eq(schema.tasks.id, taskId),
      })
    : null;
  const existingIds = new Set<string>(existingLinks.map((link: { keyResultId: string }) => link.keyResultId));

  await db.transaction((tx: TransactionLike) => {
    tx.delete(schema.taskKrLinks).where(eq(schema.taskKrLinks.taskId, taskId));

    if (dedupedLinks.length > 0) {
      tx.insert(schema.taskKrLinks).values(
        dedupedLinks.map((link) => ({
          taskId,
          keyResultId: link.keyResultId,
          countsTowardCommitment: link.countsTowardCommitment,
          committedAt: link.countsTowardCommitment ? new Date() : null,
        })),
      );
    }
  });

  if (dedupedLinks.length === 0) {
    if (task && _options?.activityContext) {
      for (const removedId of Array.from(existingIds)) {
        await recordTaskActivity(toTaskActivitySnapshot(task), _options, 'task.unlink_key_result', {
          keyResultId: removedId,
        });
      }
    }
    return [];
  }

  const links = await db.query.taskKrLinks.findMany({
    where: and(eq(schema.taskKrLinks.taskId, taskId), inArray(schema.taskKrLinks.keyResultId, dedupedLinks.map((link) => link.keyResultId))),
    with: {
      keyResult: true,
    },
  });

  if (task && _options?.activityContext) {
    const nextIds = new Set<string>(dedupedLinks.map((link) => link.keyResultId));

    for (const keyResultId of dedupedLinks.map((link) => link.keyResultId)) {
      if (!existingIds.has(keyResultId)) {
        await recordTaskActivity(toTaskActivitySnapshot(task), _options, 'task.link_key_result', {
          keyResultId,
        });
      }
    }

    for (const removedId of Array.from(existingIds)) {
      if (!nextIds.has(removedId)) {
        await recordTaskActivity(toTaskActivitySnapshot(task), _options, 'task.unlink_key_result', {
          keyResultId: removedId,
        });
      }
    }
  }

  return links;
}

export async function unlinkTaskFromAllKeyResults(taskId: string) {
  await db.delete(schema.taskKrLinks).where(eq(schema.taskKrLinks.taskId, taskId));
}

export async function listCompletedTasksBetween(periodStart: string, periodEnd: string) {
  return db.query.tasks.findMany({
    where: and(
      eq(schema.tasks.status, 'done'),
      isNotNull(schema.tasks.completedAt),
      isNull(schema.tasks.archivedAt),
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

export async function listOpenTodayDueTasks() {
  const today = formatDateOnly(new Date());
  return db.query.tasks.findMany({
    where: and(
      eq(schema.tasks.dueDate, today),
      ne(schema.tasks.status, 'done'),
      isNull(schema.tasks.archivedAt),
    ),
    orderBy: [asc(schema.tasks.createdAt)],
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

export async function listTasksWithoutKeyResults() {
  const linked = await db.query.taskKrLinks.findMany({
    columns: {
      taskId: true,
    },
  });

  const linkedIds: string[] = Array.from(new Set(linked.map((item: { taskId: string }) => item.taskId)));
  return db.query.tasks.findMany({
    where: linkedIds.length > 0
      ? and(isNull(schema.tasks.archivedAt), notInArray(schema.tasks.id, linkedIds))
      : isNull(schema.tasks.archivedAt),
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

  return links.filter((link: { task: { archivedAt?: Date | string | null; status: string } }) => (
    link.task.status === 'done' && !link.task.archivedAt
  ));
}

export async function listTasksDueSoon(fromDate: string, toDate: string) {
  return db.query.tasks.findMany({
    where: and(
      isNotNull(schema.tasks.dueDate),
      ne(schema.tasks.status, 'done'),
      isNull(schema.tasks.archivedAt),
    ),
    orderBy: [asc(schema.tasks.dueDate), asc(schema.tasks.createdAt)],
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
  const [completedTasks, openTodayDueTasks] = await Promise.all([
    listCompletedTasksBetween(periodStart, periodEnd),
    listOpenTodayDueTasks(),
  ]);

  return {
    completedTasks,
    openTodayDueTasks,
  };
}

export async function listTodayTaskCounts() {
  const today = formatDateOnly(new Date());
  const tasks = await db.query.tasks.findMany({
    where: isNull(schema.tasks.archivedAt),
    columns: {
      dueDate: true,
      completedAt: true,
      status: true,
    },
  });

  let dueTodayCount = 0;
  let completedTodayCount = 0;

  for (const task of tasks as Array<{ dueDate: string | null; completedAt: Date | null; status: string }>) {
    if (task.dueDate === today && !task.completedAt) {
      dueTodayCount += 1;
    }

    if (task.completedAt && formatDateOnly(task.completedAt) === today) {
      completedTodayCount += 1;
    }
  }

  return {
    mustCount: dueTodayCount,
    focusCount: completedTodayCount,
  };
}

export async function listTaskDashboardCounts(): Promise<TaskDashboardCounts> {
  const today = formatDateOnly(new Date());
  const tomorrow = formatDateOnly(addDays(new Date(), 1));
  const tasks = await db.query.tasks.findMany({
    where: isNull(schema.tasks.archivedAt),
    columns: {
      dueDate: true,
      completedAt: true,
      status: true,
    },
    with: {
      list: true,
    },
  });

  let inboxCount = 0;
  let dueTodayCount = 0;
  let dueTomorrowCount = 0;
  let overdueCount = 0;
  let completedCount = 0;

  for (const task of tasks as Array<{ dueDate: string | null; completedAt: Date | null; status: string; list: { slug?: string } | null }>) {
    if (task.completedAt || task.status === 'done') {
      completedCount += 1;
      continue;
    }

    if (task.list?.slug === 'inbox') {
      inboxCount += 1;
    }

    if (!task.dueDate) {
      continue;
    }

    if (task.dueDate < today) {
      overdueCount += 1;
    } else if (task.dueDate === today) {
      dueTodayCount += 1;
    } else if (task.dueDate === tomorrow) {
      dueTomorrowCount += 1;
    }
  }

  return {
    inboxCount,
    dueTodayCount,
    dueTomorrowCount,
    overdueCount,
    completedCount,
  };
}

export async function getTaskLinkKeyResultIds(taskId: string) {
  const links = await db.query.taskKrLinks.findMany({
    where: eq(schema.taskKrLinks.taskId, taskId),
    orderBy: [asc(schema.taskKrLinks.createdAt)],
  });

  return links.map((link: { keyResultId: string }) => link.keyResultId);
}

export async function listTaskListsWithCounts(): Promise<TaskListSummary[]> {
  const [lists, tasks] = await Promise.all([
    db.query.taskLists.findMany({
      where: isNull(schema.taskLists.archivedAt),
      orderBy: [asc(schema.taskLists.sortOrder), asc(schema.taskLists.createdAt)],
    }),
    db.query.tasks.findMany({
      where: isNull(schema.tasks.archivedAt),
      columns: {
        listId: true,
      },
    }),
  ]);

  const countByListId = new Map<string, number>();
  for (const task of tasks as Array<{ listId: string | null }>) {
    if (!task.listId) continue;
    countByListId.set(task.listId, (countByListId.get(task.listId) ?? 0) + 1);
  }

  return lists.map((list: { id: string; name: string; icon: string | null; kind: string; slug: string }) => ({
    id: list.id,
    name: list.name,
    icon: list.icon ?? null,
    kind: list.kind,
    slug: list.slug,
    taskCount: countByListId.get(list.id) ?? 0,
  }));
}

export async function listTaskWorkspaceTasks() {
  return db.query.tasks.findMany({
    where: isNull(schema.tasks.archivedAt),
    orderBy: [asc(schema.tasks.dueDate), asc(schema.tasks.createdAt)],
    with: {
      list: true,
      definition: true,
      keyResultLinks: {
        with: {
          keyResult: true,
        },
      },
    },
  });
}

export async function listTaskSources(): Promise<TaskSourceSummary[]> {
  const now = new Date();
  const today = formatDateOnly(now);
  const tomorrow = formatDateOnly(addDays(now, 1));
  const next7End = formatDateOnly(addDays(now, 6));
  const [lists, tasks] = await Promise.all([
    listTaskListsWithCounts(),
    listTaskWorkspaceTasks(),
  ]);

  const smartSources: TaskSourceSummary[] = [
    {
      id: 'all',
      kind: 'smart',
      title: '所有',
      icon: TASK_SOURCE_ICONS.all,
      count: tasks.length,
    },
    {
      id: 'today',
      kind: 'smart',
      title: '今天',
      icon: TASK_SOURCE_ICONS.today,
      count: tasks.filter((task: TaskWorkspaceTask) => normalizeDateValue(task.dueDate) === today).length,
    },
    {
      id: 'tomorrow',
      kind: 'smart',
      title: '明天',
      icon: TASK_SOURCE_ICONS.tomorrow,
      count: tasks.filter((task: TaskWorkspaceTask) => normalizeDateValue(task.dueDate) === tomorrow).length,
    },
    {
      id: 'inbox',
      kind: 'smart',
      title: '收集箱',
      icon: TASK_SOURCE_ICONS.inbox,
      count: tasks.filter((task: TaskWorkspaceTask) => task.list?.slug === 'inbox').length,
    },
    {
      id: 'next-7-days',
      kind: 'smart',
      title: '最近 7 天',
      icon: TASK_SOURCE_ICONS['next-7-days'],
      count: tasks.filter((task: TaskWorkspaceTask) => {
        const dueDate = normalizeDateValue(task.dueDate);
        return dueDate !== null && dueDate >= today && dueDate <= next7End;
      }).length,
    },
  ];

  const listSources: TaskSourceSummary[] = lists.map((list) => ({
    id: buildTaskListSourceId(list.id),
    kind: 'list',
    title: list.name,
    icon: list.icon ?? 'list',
    count: list.taskCount,
    listId: list.id,
  }));

  return [...smartSources, ...listSources];
}

export async function listTasksForSource(sourceId: TaskSourceId): Promise<TaskGroup[]> {
  const now = new Date();
  const today = formatDateOnly(now);
  const tomorrow = formatDateOnly(addDays(now, 1));
  const next7End = formatDateOnly(addDays(now, 6));
  const tasks = await listTaskWorkspaceTasks();
  const filtered = filterTasksBySource(tasks, sourceId, today, tomorrow, next7End);
  return groupTasksForWorkspace(filtered, today, tomorrow);
}

export async function getTaskDetail(taskId: string) {
  return db.query.tasks.findFirst({
    where: eq(schema.tasks.id, taskId),
    with: {
      list: true,
      definition: true,
      keyResultLinks: {
        with: {
          keyResult: true,
        },
      },
    },
  });
}

export async function createTaskDefinition(input: TaskDefinitionWriteInput) {
  const normalized = normalizeTaskDefinitionInput(input);
  const [definition] = await db.insert(schema.taskDefinitions).values(normalized).returning();
  return definition;
}

export async function listTaskDefinitions() {
  return db.query.taskDefinitions.findMany({
    where: isNull(schema.taskDefinitions.archivedAt),
    orderBy: [asc(schema.taskDefinitions.createdAt)],
    with: {
      list: true,
      keyResultLinks: {
        with: {
          keyResult: true,
        },
      },
      tasks: {
        where: isNull(schema.tasks.archivedAt),
        orderBy: [desc(schema.tasks.occurrenceDate), desc(schema.tasks.createdAt)],
        limit: 5,
      },
    },
  });
}

export async function getTaskDefinition(definitionId: string, options?: { includeArchived?: boolean }) {
  return db.query.taskDefinitions.findFirst({
    where: options?.includeArchived
      ? eq(schema.taskDefinitions.id, definitionId)
      : and(eq(schema.taskDefinitions.id, definitionId), isNull(schema.taskDefinitions.archivedAt)),
    with: {
      list: true,
      keyResultLinks: {
        with: {
          keyResult: true,
        },
      },
      tasks: {
        where: isNull(schema.tasks.archivedAt),
        orderBy: [desc(schema.tasks.occurrenceDate), desc(schema.tasks.createdAt)],
        limit: 20,
      },
    },
  });
}

export async function getTaskDefinitionDetail(definitionId: string, options?: { includeArchived?: boolean }) {
  return getTaskDefinition(definitionId, options);
}

export async function updateTaskDefinition(definitionId: string, input: Partial<TaskDefinitionWriteInput>) {
  const existing = await db.query.taskDefinitions.findFirst({
    where: eq(schema.taskDefinitions.id, definitionId),
  });

  if (!existing) {
    return null;
  }

  const normalized = normalizeTaskDefinitionInput({
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    listId: input.listId ?? existing.listId,
    frequency: input.frequency ?? existing.frequency,
    endType: input.endType ?? existing.endType,
    endDate: input.endDate ?? existing.endDate,
    occurrenceCount: input.occurrenceCount ?? existing.occurrenceCount,
  });

  const [definition] = await db
    .update(schema.taskDefinitions)
    .set({
      ...normalized,
      updatedAt: new Date(),
    })
    .where(eq(schema.taskDefinitions.id, definitionId))
    .returning();

  return definition ?? null;
}

export async function archiveTaskDefinition(definitionId: string) {
  const existing = await db.query.taskDefinitions.findFirst({
    where: eq(schema.taskDefinitions.id, definitionId),
  });

  if (!existing) {
    return null;
  }

  await db.update(schema.taskDefinitions)
    .set({
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.taskDefinitions.id, definitionId));

  await db.update(schema.tasks)
    .set({
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(schema.tasks.definitionId, definitionId), isNull(schema.tasks.archivedAt)));

  return getTaskDefinition(definitionId, { includeArchived: true });
}

export async function restoreTaskDefinition(definitionId: string) {
  const existing = await db.query.taskDefinitions.findFirst({
    where: eq(schema.taskDefinitions.id, definitionId),
  });

  if (!existing) {
    return null;
  }

  await db.update(schema.taskDefinitions)
    .set({
      archivedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.taskDefinitions.id, definitionId));

  await db.update(schema.tasks)
    .set({
      archivedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.tasks.definitionId, definitionId));

  return getTaskDefinition(definitionId, { includeArchived: true });
}
export async function replaceTaskDefinitionKeyResultLinks(definitionId: string, keyResultLinks: Array<string | TaskKeyResultLinkInput>) {
  const dedupedLinks = Array.from(new Map(
    keyResultLinks
      .map((item) => typeof item === 'string'
        ? { keyResultId: item, countsTowardCommitment: false }
        : { keyResultId: item.keyResultId, countsTowardCommitment: Boolean(item.countsTowardCommitment) })
      .filter((item) => item.keyResultId)
      .map((item) => [item.keyResultId, item]),
  ).values());

  await db.transaction((tx: TransactionLike) => {
    tx.delete(schema.taskDefinitionKrLinks).where(eq(schema.taskDefinitionKrLinks.definitionId, definitionId));

    if (dedupedLinks.length > 0) {
      tx.insert(schema.taskDefinitionKrLinks).values(
        dedupedLinks.map((link) => ({
          definitionId,
          keyResultId: link.keyResultId,
          countsTowardCommitment: link.countsTowardCommitment,
          committedAt: link.countsTowardCommitment ? new Date() : null,
        })),
      );
    }
  });

  if (dedupedLinks.length === 0) {
    return [];
  }

  return db.query.taskDefinitionKrLinks.findMany({
    where: and(
      eq(schema.taskDefinitionKrLinks.definitionId, definitionId),
      inArray(schema.taskDefinitionKrLinks.keyResultId, dedupedLinks.map((link) => link.keyResultId)),
    ),
    with: {
      keyResult: true,
    },
  });
}

function shouldGenerateDefinitionForDate(
  definition: {
    frequency: TaskDefinitionFrequency;
    endType: TaskDefinitionEndType;
    endDate: string | null;
    occurrenceCount: number | null;
  },
  anchorDate: Date,
  targetDate: Date,
) {
  const dateOnly = formatDateOnly(targetDate);
  if (definition.endType === 'until_date' && definition.endDate && dateOnly > definition.endDate) {
    return false;
  }

  switch (definition.frequency) {
    case 'daily':
      return true;
    case 'weekly':
      return targetDate.getDay() === anchorDate.getDay();
    case 'monthly':
      return targetDate.getDate() === anchorDate.getDate();
    case 'weekdays': {
      const day = targetDate.getDay();
      return day >= 1 && day <= 5;
    }
    case 'weekends': {
      const day = targetDate.getDay();
      return day === 0 || day === 6;
    }
    default:
      return true;
  }
}

export async function ensureRecurringTasksForDate(targetDateInput?: string) {
  const targetDate = targetDateInput ? parseDateOnlyInput(targetDateInput) : new Date();
  const occurrenceDate = formatDateOnly(targetDate);
  const definitions = await db.query.taskDefinitions.findMany({
    where: isNull(schema.taskDefinitions.archivedAt),
    with: {
      keyResultLinks: true,
    },
  });

  const createdTaskIds: string[] = [];

  for (const definition of definitions) {
    const existingOccurrences = await db.query.tasks.findMany({
      where: eq(schema.tasks.definitionId, definition.id),
      orderBy: [asc(schema.tasks.occurrenceDate), asc(schema.tasks.createdAt)],
    });

    if (
      definition.endType === 'after_count'
      && definition.occurrenceCount !== null
      && existingOccurrences.length >= definition.occurrenceCount
    ) {
      continue;
    }

    const anchorDate = existingOccurrences[0]?.occurrenceDate
      ? toDateOnlyDate(existingOccurrences[0].occurrenceDate)
      : targetDate;

    if (!shouldGenerateDefinitionForDate(definition, anchorDate, targetDate)) {
      continue;
    }

    if (existingOccurrences.some((task: { occurrenceDate: string | null }) => task.occurrenceDate === occurrenceDate)) {
      continue;
    }

    const [created] = await db.insert(schema.tasks).values({
      title: definition.title,
      description: definition.description,
      listId: definition.listId,
      dueDate: occurrenceDate,
      definitionId: definition.id,
      occurrenceDate,
    }).returning();

    createdTaskIds.push(created.id);

    if (definition.keyResultLinks.length > 0) {
      await db.insert(schema.taskKrLinks).values(
        definition.keyResultLinks.map((link: { keyResultId: string; countsTowardCommitment?: boolean | null; committedAt?: Date | null }) => ({
          taskId: created.id,
          keyResultId: link.keyResultId,
          countsTowardCommitment: Boolean(link.countsTowardCommitment),
          committedAt: link.countsTowardCommitment ? (link.committedAt ?? new Date()) : null,
        })),
      );
    }
  }

  return createdTaskIds;
}

export async function ensureTodayRecurringTasks() {
  await ensureRecurringTasksForDate(formatDateOnly(new Date()));
}
