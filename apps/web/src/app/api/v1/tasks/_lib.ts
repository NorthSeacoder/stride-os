import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/api-auth';
import { badRequest, getTrimmedString, parseJsonBody, requireParam, unauthorized } from '../../_lib/validation';
import { type ActivityAuthenticatedUser, type ActivityContext } from '@/lib/services/activity-service';
import {
  QUADRANT_KEYS,
  TASK_ENERGIES,
  TASK_PRIORITIES,
  TASK_DEFINITION_END_TYPES,
  TASK_DEFINITION_FREQUENCIES,
  type TaskEnergy,
  type TaskDefinitionEndType,
  type TaskDefinitionFrequency,
  type TaskKeyResultLinkInput,
  type TaskPriority,
  type TaskQuadrantKey,
  type TaskSourceId,
  type TaskDefinitionWriteInput,
  type TaskWriteInput,
} from '@/lib/services/task-service';

type AuthedUser = ActivityAuthenticatedUser;

export async function requireTaskApiUser(request: NextRequest): Promise<AuthedUser | NextResponse> {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();
  return user as AuthedUser;
}

export async function requireTaskId(params: Promise<{ id: string }>) {
  const { id } = await params;
  const taskId = id.trim();
  const error = requireParam(taskId, 'Task id');
  return error ?? taskId;
}

function stringOrNull(value: unknown) {
  if (value === null) return null;
  if (value === undefined) return undefined;
  return getTrimmedString(value) || null;
}

function enumOrNull<T extends string>(value: unknown, allowed: readonly T[], label: string): T | null | undefined | NextResponse {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const normalized = getTrimmedString(value);
  if (!allowed.includes(normalized as T)) {
    return badRequest(`${label} is invalid`);
  }
  return normalized as T;
}

function parseCompletedAt(value: unknown): Date | null | undefined | NextResponse {
  if (value === undefined) return undefined;
  if (value === null || value === false) return null;
  if (value === true) return new Date();
  if (typeof value !== 'string') return badRequest('completedAt is invalid');

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return badRequest('completedAt is invalid');
  return date;
}

function parseTaskInput(body: Record<string, unknown>, mode: 'create' | 'update'): TaskWriteInput | Partial<TaskWriteInput> | NextResponse {
  const title = body.title === undefined ? undefined : getTrimmedString(body.title);
  if (mode === 'create' && !title) return badRequest('Title is required');
  if (mode === 'update' && body.title !== undefined && !title) return badRequest('Title is required');

  const priority = enumOrNull<TaskPriority>(body.priority, TASK_PRIORITIES, 'priority');
  if (priority instanceof NextResponse) return priority;

  const energy = enumOrNull<TaskEnergy>(body.energy, TASK_ENERGIES, 'energy');
  if (energy instanceof NextResponse) return energy;

  const completedAt = parseCompletedAt(body.completedAt);
  if (completedAt instanceof NextResponse) return completedAt;

  return {
    ...(title !== undefined ? { title } : {}),
    ...(body.notes !== undefined ? { notes: stringOrNull(body.notes) } : {}),
    ...(body.description !== undefined ? { description: stringOrNull(body.description) } : {}),
    ...(body.listId !== undefined ? { listId: stringOrNull(body.listId) } : {}),
    ...(body.dueDate !== undefined ? { dueDate: stringOrNull(body.dueDate) } : {}),
    ...(priority !== undefined ? { priority } : {}),
    ...(energy !== undefined ? { energy } : {}),
    ...(completedAt !== undefined ? { completedAt } : {}),
  };
}

export async function parseTaskWriteRequest(request: NextRequest, mode: 'create' | 'update') {
  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) return body;
  return parseTaskInput(body, mode);
}

export function getKeyResultIdsFromBody(body: Record<string, unknown>) {
  return Array.isArray(body.keyResultIds)
    ? body.keyResultIds.map((value) => String(value).trim()).filter(Boolean)
    : undefined;
}

function enumString<T extends string>(value: unknown, allowed: readonly T[], label: string): T | undefined | NextResponse {
  if (value === undefined) return undefined;
  const normalized = getTrimmedString(value);
  if (!normalized) return badRequest(`${label} is required`);
  if (!allowed.includes(normalized as T)) {
    return badRequest(`${label} is invalid`);
  }
  return normalized as T;
}

function parseOptionalPositiveInteger(value: unknown, label: string) {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    return badRequest(`${label} is invalid`);
  }
  return normalized;
}

export function getTaskDefinitionKeyResultLinksFromBody(body: Record<string, unknown>) {
  if (!Array.isArray(body.keyResultLinks)) {
    return undefined;
  }

  const links: TaskKeyResultLinkInput[] = [];
  for (const item of body.keyResultLinks) {
    if (!item || typeof item !== 'object') {
      return badRequest('keyResultLinks is invalid');
    }

    const keyResultId = getTrimmedString((item as Record<string, unknown>).keyResultId);
    if (!keyResultId) {
      return badRequest('keyResultLinks is invalid');
    }

    links.push({
      keyResultId,
      countsTowardCommitment: Boolean((item as Record<string, unknown>).countsTowardCommitment),
    });
  }

  return links;
}

function parseTaskDefinitionInput(body: Record<string, unknown>, mode: 'create' | 'update') {
  const title = body.title === undefined ? undefined : getTrimmedString(body.title);
  if (mode === 'create' && !title) return badRequest('Title is required');
  if (mode === 'update' && body.title !== undefined && !title) return badRequest('Title is required');

  const frequency = enumString<TaskDefinitionFrequency>(body.frequency, TASK_DEFINITION_FREQUENCIES, 'frequency');
  if (frequency instanceof NextResponse) return frequency;

  const endType = enumString<TaskDefinitionEndType>(body.endType, TASK_DEFINITION_END_TYPES, 'endType');
  if (endType instanceof NextResponse) return endType;

  const occurrenceCount = parseOptionalPositiveInteger(body.occurrenceCount, 'occurrenceCount');
  if (occurrenceCount instanceof NextResponse) return occurrenceCount;

  const input: TaskDefinitionWriteInput | Partial<TaskDefinitionWriteInput> = {
    ...(title !== undefined ? { title } : {}),
    ...(body.description !== undefined ? { description: stringOrNull(body.description) } : {}),
    ...(body.listId !== undefined ? { listId: stringOrNull(body.listId) ?? undefined } : {}),
    ...(frequency !== undefined ? { frequency } : {}),
    ...(endType !== undefined ? { endType } : {}),
    ...(body.endDate !== undefined ? { endDate: stringOrNull(body.endDate) } : {}),
    ...(occurrenceCount !== undefined ? { occurrenceCount } : {}),
  };

  if (mode === 'create' && !(input as TaskDefinitionWriteInput).listId) {
    return badRequest('listId is required');
  }

  if (mode === 'create' && !(input as TaskDefinitionWriteInput).frequency) {
    return badRequest('frequency is required');
  }

  if (mode === 'create' && !(input as TaskDefinitionWriteInput).endType) {
    return badRequest('endType is required');
  }

  return input;
}

export async function parseTaskDefinitionWriteRequest(request: NextRequest, mode: 'create' | 'update') {
  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) return body;
  return parseTaskDefinitionInput(body, mode);
}

export function parseQuadrant(value: unknown): TaskQuadrantKey | NextResponse {
  const quadrant = getTrimmedString(value);
  if (!QUADRANT_KEYS.includes(quadrant as TaskQuadrantKey)) {
    return badRequest('quadrant is invalid');
  }
  return quadrant as TaskQuadrantKey;
}

export function parseTaskSource(value: string | null): TaskSourceId | NextResponse {
  const source = value?.trim() || 'all';
  if (['all', 'today', 'tomorrow', 'inbox', 'next-7-days'].includes(source) || source.startsWith('list:')) {
    return source as TaskSourceId;
  }
  return badRequest('source is invalid');
}

export function getTaskActivityContext(user: AuthedUser): ActivityContext | undefined {
  return user.activityContext;
}

export function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}
