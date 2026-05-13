import {
  and,
  desc,
  eq,
  gte,
  like,
  lte,
  lt,
  or,
  sql,
} from 'drizzle-orm';
import { db, schema } from '@stride-os/db';
import {
  ACTIVITY_ACTOR_TYPES,
  ACTIVITY_SOURCES,
  type ActivityActorType,
  type ActivitySource,
  ACTIVITY_TARGET_TYPES,
} from '@/lib/activity/constants';
import {
  getConfidenceLabel,
  getActivityFieldLabel,
  getKeyResultStatusLabel,
  getObjectiveStatusLabel,
  getPeriodStatusLabel,
  getReviewStatusLabel,
  getTaskPriorityLabel,
  getTaskStatusLabel,
} from '@/lib/presentation/labels';

type Primitive = string | number | boolean | null;

export type ActivityDiffValue = Primitive | Primitive[];
export type ActivityDiffEntry = {
  field: string;
  label: string;
  before: ActivityDiffValue;
  after: ActivityDiffValue;
  beforeLabel?: string;
  afterLabel?: string;
};

export type ActivityMetadata = {
  changedFields?: string[];
  diff?: ActivityDiffEntry[];
  requestId?: string;
  command?: string;
  actorLabel?: string;
  sourceLabel?: string;
  [key: string]: unknown;
};

export type ActivityContext = {
  actorType: ActivityActorType;
  actorId?: string | null;
  actorLabel?: string | null;
  source: ActivitySource;
  sourceLabel?: string | null;
  requestId?: string | null;
  command?: string | null;
};

export type ActivityAuthenticatedUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  activityContext?: ActivityContext;
};

export type ActivityRecordInput = {
  actorType: string;
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  targetTitle?: string | null;
  source?: string | null;
  summary?: string | null;
  metadata?: ActivityMetadata | null;
  createdAt?: Date;
};

export type ActivityQuery = {
  start?: Date;
  end?: Date;
  targetType?: string;
  targetId?: string;
  actorType?: string;
  actorId?: string;
  source?: string;
  action?: string;
  keyword?: string;
  changedField?: string;
  cursor?: string;
  limit?: number;
};

type AuditLogRow = typeof schema.auditLogs.$inferSelect;

export type ActivityListRow = {
  id: string;
  createdAt: Date;
  actorType: string;
  actorId: string | null;
  actorLabel: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetTitle: string | null;
  source: string | null;
  sourceLabel: string | null;
  summary: string | null;
  changedFields: string[];
  diff: ActivityDiffEntry[];
  metadata: ActivityMetadata | null;
};

export type ActivityListResult = {
  items: ActivityListRow[];
  nextCursor: string | null;
};

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;
const CHANGED_FIELD_SCAN_MULTIPLIER = 5;
const SAFE_METADATA_KEYS = new Set([
  'changedFields',
  'diff',
  'requestId',
  'command',
  'actorLabel',
  'sourceLabel',
  'listId',
  'listName',
  'quadrant',
  'title',
  'status',
  'priority',
  'dueDate',
  'currentValue',
  'targetValue',
  'confidence',
  'reviewStatus',
  'completed',
  'completedAt',
]);
const BLOCKED_METADATA_KEYS = new Set([
  'token',
  'tokenHash',
  'password',
  'passwordHash',
  'secret',
  'credential',
  'authorization',
  'cookie',
  'headers',
  'rawPayload',
  'payload',
]);

function clampLimit(limit?: number) {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(limit, 1), MAX_LIMIT);
}

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isPrimitiveArray(value: unknown): value is Primitive[] {
  return Array.isArray(value) && value.every((item) => item === null || ['string', 'number', 'boolean'].includes(typeof item));
}

function sanitizeDiffEntry(entry: unknown): ActivityDiffEntry | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const candidate = entry as Record<string, unknown>;
  const field = normalizeText(typeof candidate.field === 'string' ? candidate.field : null);
  if (!field) {
    return null;
  }

  const before = candidate.before;
  const after = candidate.after;
  const beforeIsValid = before === null || ['string', 'number', 'boolean'].includes(typeof before) || isPrimitiveArray(before);
  const afterIsValid = after === null || ['string', 'number', 'boolean'].includes(typeof after) || isPrimitiveArray(after);
  if (!beforeIsValid || !afterIsValid) {
    return null;
  }

  return {
    field,
    label: normalizeText(typeof candidate.label === 'string' ? candidate.label : null) ?? getActivityFieldLabel(field),
    before: before as ActivityDiffValue,
    after: after as ActivityDiffValue,
    beforeLabel: normalizeText(typeof candidate.beforeLabel === 'string' ? candidate.beforeLabel : null) ?? undefined,
    afterLabel: normalizeText(typeof candidate.afterLabel === 'string' ? candidate.afterLabel : null) ?? undefined,
  };
}

export function sanitizeActivityMetadata(metadata?: ActivityMetadata | null) {
  if (!metadata) {
    return null;
  }

  const sanitized: ActivityMetadata = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (BLOCKED_METADATA_KEYS.has(key)) {
      continue;
    }

    if (!SAFE_METADATA_KEYS.has(key)) {
      continue;
    }

    if (key === 'changedFields' && Array.isArray(value)) {
      sanitized.changedFields = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
      continue;
    }

    if (key === 'diff' && Array.isArray(value)) {
      sanitized.diff = value.map(sanitizeDiffEntry).filter((item): item is ActivityDiffEntry => item !== null);
      continue;
    }

    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
      sanitized[key] = value;
      continue;
    }

    if (isPrimitiveArray(value)) {
      sanitized[key] = value;
    }
  }

  if (sanitized.changedFields && sanitized.changedFields.length > 0 && !sanitized.diff) {
    sanitized.diff = [];
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}
function formatDateValue(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}

function formatFieldValue(field: string, value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalized = formatDateValue(value);

  if (field === 'status') {
    return getTaskStatusLabel(String(normalized));
  }

  if (field === 'priority') {
    return getTaskPriorityLabel(typeof normalized === 'string' ? normalized : String(normalized));
  }

  if (field === 'confidence') {
    return getConfidenceLabel(String(normalized));
  }

  if (field === 'reviewStatus') {
    return getReviewStatusLabel(String(normalized));
  }

  if (field === 'periodStatus') {
    return getPeriodStatusLabel(String(normalized));
  }

  if (field === 'objectiveStatus') {
    return getObjectiveStatusLabel(String(normalized));
  }

  if (field === 'keyResultStatus') {
    return getKeyResultStatusLabel(String(normalized));
  }

  if (Array.isArray(normalized)) {
    return normalized.join(', ');
  }

  return String(normalized);
}

export function buildActivityDiff<TBefore extends Record<string, unknown>, TAfter extends Record<string, unknown>>(
  before: TBefore,
  after: TAfter,
  fields: string[],
) {
  const changedFields: string[] = [];
  const diff: ActivityDiffEntry[] = [];

  for (const field of fields) {
    const beforeValue = formatDateValue(before[field]);
    const afterValue = formatDateValue(after[field]);
    if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) {
      continue;
    }

    changedFields.push(field);
    diff.push({
      field,
      label: getActivityFieldLabel(field),
      before: (beforeValue ?? null) as ActivityDiffValue,
      after: (afterValue ?? null) as ActivityDiffValue,
      beforeLabel: formatFieldValue(field, beforeValue),
      afterLabel: formatFieldValue(field, afterValue),
    });
  }

  return { changedFields, diff };
}

function buildActivityCursor(createdAt: Date, id: string) {
  return `${createdAt.toISOString()}::${id}`;
}

function parseActivityCursor(cursor?: string) {
  if (!cursor) {
    return null;
  }

  const [createdAtRaw, id] = cursor.split('::');
  if (!createdAtRaw || !id) {
    return null;
  }

  const createdAt = new Date(createdAtRaw);
  if (Number.isNaN(createdAt.getTime())) {
    return null;
  }

  return { createdAt, id };
}

function hasChangedField(row: AuditLogRow, field: string) {
  const changedFields = Array.isArray(row.metadata?.changedFields)
    ? row.metadata.changedFields.filter((item): item is string => typeof item === 'string')
    : [];

  return changedFields.includes(field);
}

function mapActivityRow(row: AuditLogRow): ActivityListRow {
  const metadata = sanitizeActivityMetadata((row.metadata ?? null) as ActivityMetadata | null);

  return {
    id: String(row.id),
    createdAt: row.createdAt,
    actorType: row.actorType,
    actorId: row.actorId ? String(row.actorId) : null,
    actorLabel: typeof metadata?.actorLabel === 'string' ? metadata.actorLabel : null,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId ? String(row.targetId) : null,
    targetTitle: row.targetTitle,
    source: row.source,
    sourceLabel: typeof metadata?.sourceLabel === 'string' ? metadata.sourceLabel : null,
    summary: row.summary,
    changedFields: metadata?.changedFields ?? [],
    diff: metadata?.diff ?? [],
    metadata,
  };
}

export async function recordActivity(input: ActivityRecordInput) {
  const metadata = sanitizeActivityMetadata(input.metadata);
  const values = {
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    targetTitle: normalizeText(input.targetTitle),
    source: normalizeText(input.source),
    summary: normalizeText(input.summary),
    metadata: metadata ?? undefined,
    createdAt: input.createdAt ?? new Date(),
  };

  const [row] = await db.insert(schema.auditLogs).values(values).returning();
  return row;
}

export async function listActivity(query: ActivityQuery = {}): Promise<ActivityListResult> {
  const limit = clampLimit(query.limit);
  const cursor = parseActivityCursor(query.cursor);
  const keyword = normalizeText(query.keyword)?.toLowerCase() ?? null;

  const filters = [
    query.start ? gte(schema.auditLogs.createdAt, query.start) : undefined,
    query.end ? lte(schema.auditLogs.createdAt, query.end) : undefined,
    query.targetType ? eq(schema.auditLogs.targetType, query.targetType) : undefined,
    query.targetId ? eq(schema.auditLogs.targetId, query.targetId) : undefined,
    query.actorType ? eq(schema.auditLogs.actorType, query.actorType) : undefined,
    query.actorId ? eq(schema.auditLogs.actorId, query.actorId) : undefined,
    query.source ? eq(schema.auditLogs.source, query.source) : undefined,
    query.action ? eq(schema.auditLogs.action, query.action) : undefined,
    keyword
      ? or(
          like(sql`lower(${schema.auditLogs.summary})`, `%${keyword}%`),
          like(sql`lower(${schema.auditLogs.targetTitle})`, `%${keyword}%`),
          like(sql`lower(${schema.auditLogs.action})`, `%${keyword}%`),
          like(sql`lower(${schema.auditLogs.source})`, `%${keyword}%`),
        )
      : undefined,
    cursor
      ? or(
          lt(schema.auditLogs.createdAt, cursor.createdAt),
          and(eq(schema.auditLogs.createdAt, cursor.createdAt), lt(schema.auditLogs.id, cursor.id)),
        )
      : undefined,
  ].filter(Boolean);

  const fetchLimit = query.changedField ? limit * CHANGED_FIELD_SCAN_MULTIPLIER + 1 : limit + 1;
  const rows = await db.query.auditLogs.findMany({
    where: filters.length > 0 ? and(...filters) : undefined,
    orderBy: [desc(schema.auditLogs.createdAt), desc(schema.auditLogs.id)],
    limit: fetchLimit,
  });

  let filteredRows = rows;
  if (query.changedField) {
    filteredRows = rows.filter((row: AuditLogRow) => hasChangedField(row, query.changedField!));
  }

  const pageRows = filteredRows.slice(0, limit);
  const nextRow = filteredRows[limit] ?? null;

  return {
    items: pageRows.map(mapActivityRow),
    nextCursor: nextRow ? buildActivityCursor(nextRow.createdAt, String(nextRow.id)) : null,
  };
}

export function buildWebActivityContext(input: {
  userId: string;
  actorLabel?: string | null;
}): ActivityContext {
  return {
    actorType: 'user',
    actorId: input.userId,
    actorLabel: normalizeText(input.actorLabel) ?? null,
    source: 'web',
  };
}

function parseTrustedSource(value: string | null | undefined): ActivitySource {
  if (!value) {
    return 'api';
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'cli' || normalized === 'hermes' || normalized === 'agent') {
    return normalized;
  }

  if (normalized === 'system') {
    return 'system';
  }

  if (normalized === 'unknown') {
    return 'unknown';
  }

  return 'api';
}

export function buildApiActivityContext(input: {
  actorType?: ActivityActorType;
  actorId?: string | null;
  actorLabel?: string | null;
  trustedSource?: string | null;
  trustedSourceLabel?: string | null;
  requestId?: string | null;
  command?: string | null;
}): ActivityContext {
  return {
    actorType: input.actorType ?? 'user',
    actorId: input.actorId ?? null,
    actorLabel: normalizeText(input.actorLabel) ?? null,
    source: parseTrustedSource(input.trustedSource),
    sourceLabel: normalizeText(input.trustedSourceLabel) ?? null,
    requestId: normalizeText(input.requestId) ?? null,
    command: normalizeText(input.command) ?? null,
  };
}
