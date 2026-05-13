import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/api-auth';
import { recordAuditLog } from '../../_lib/audit';
import { badRequest, getTrimmedString, parseJsonBody, requireParam, unauthorized } from '../../_lib/validation';
import {
  QUADRANT_KEYS,
  TASK_ENERGIES,
  TASK_PRIORITIES,
  type TaskEnergy,
  type TaskPriority,
  type TaskQuadrantKey,
  type TaskSourceId,
  type TaskWriteInput,
} from '@/lib/services/task-service';

type AuthedUser = { id: string };

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

export async function recordTaskAudit(userId: string, action: string, taskId?: string | null, metadata?: Record<string, unknown>) {
  await recordAuditLog({
    actorId: userId,
    action,
    targetType: 'task',
    targetId: taskId,
    metadata,
  });
}

export function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}
