import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/api-auth';
import { badRequest, getTrimmedString, parseJsonBody, requireParam, unauthorized } from '../../_lib/validation';
import { type ActivityAuthenticatedUser, type ActivityContext } from '@/lib/services/activity-service';
import {
  CHECK_IN_CONFIDENCE,
  KEY_RESULT_STATUSES,
  KEY_RESULT_TYPES,
  OBJECTIVE_STATUSES,
  PERIOD_STATUSES,
  PERIOD_TYPES,
  type CheckInConfidence,
  type CheckInWriteInput,
  type KeyResultStatus,
  type KeyResultType,
  type KeyResultWriteInput,
  type ObjectiveStatus,
  type ObjectiveWriteInput,
  type PeriodStatus,
  type PeriodType,
  type PeriodWriteInput,
} from '@/lib/services/okr-service';

type AuthedUser = ActivityAuthenticatedUser;

export async function requireOkrApiUser(request: NextRequest): Promise<AuthedUser | NextResponse> {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();
  return user as AuthedUser;
}

export async function requireId(params: Promise<{ id: string }>, label: string) {
  const { id } = await params;
  const normalized = id.trim();
  const error = requireParam(normalized, label);
  return error ?? normalized;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], label: string, required = false): T | undefined | NextResponse {
  if (value === undefined || value === null || value === '') {
    return required ? badRequest(`${label} is required`) : undefined;
  }
  const normalized = getTrimmedString(value);
  if (!allowed.includes(normalized as T)) return badRequest(`${label} is invalid`);
  return normalized as T;
}

function textValue(value: unknown, label: string, required = false) {
  if (value === undefined || value === null) return required ? badRequest(`${label} is required`) : undefined;
  const normalized = getTrimmedString(value);
  if (required && !normalized) return badRequest(`${label} is required`);
  return normalized || null;
}

function numberValue(value: unknown, label: string) {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) return badRequest(`${label} is invalid`);
  return number;
}

async function parseBody(request: NextRequest) {
  const body = await parseJsonBody(request);
  return body;
}

export async function parsePeriodInput(request: NextRequest, mode: 'create' | 'update') {
  const body = await parseBody(request);
  if (body instanceof NextResponse) return body;
  const type = enumValue<PeriodType>(body.type, PERIOD_TYPES, 'type', mode === 'create');
  if (type instanceof NextResponse) return type;
  const status = enumValue<PeriodStatus>(body.status, PERIOD_STATUSES, 'status');
  if (status instanceof NextResponse) return status;
  const name = textValue(body.name, 'name', mode === 'create');
  if (name instanceof NextResponse) return name;
  const startDate = textValue(body.startDate, 'startDate', mode === 'create');
  if (startDate instanceof NextResponse) return startDate;
  const endDate = textValue(body.endDate, 'endDate', mode === 'create');
  if (endDate instanceof NextResponse) return endDate;

  return {
    ...(name !== undefined ? { name } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(startDate !== undefined ? { startDate } : {}),
    ...(endDate !== undefined ? { endDate } : {}),
    ...(status !== undefined ? { status } : {}),
  } as PeriodWriteInput | Partial<PeriodWriteInput>;
}

export async function parseObjectiveInput(request: NextRequest, mode: 'create' | 'update') {
  const body = await parseBody(request);
  if (body instanceof NextResponse) return body;
  const title = textValue(body.title, 'title', mode === 'create');
  if (title instanceof NextResponse) return title;
  const status = enumValue<ObjectiveStatus>(body.status, OBJECTIVE_STATUSES, 'status');
  if (status instanceof NextResponse) return status;
  const sortOrder = numberValue(body.sortOrder, 'sortOrder');
  if (sortOrder instanceof NextResponse) return sortOrder;
  const periodId = textValue(body.periodId, 'periodId', mode === 'create');
  if (periodId instanceof NextResponse) return periodId;

  return {
    ...(periodId !== undefined ? { periodId } : {}),
    ...(title !== undefined ? { title } : {}),
    ...(body.description !== undefined ? { description: textValue(body.description, 'description') } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(sortOrder !== undefined ? { sortOrder } : {}),
  } as ObjectiveWriteInput | Partial<ObjectiveWriteInput>;
}

export async function parseKeyResultInput(request: NextRequest, mode: 'create' | 'update') {
  const body = await parseBody(request);
  if (body instanceof NextResponse) return body;
  const title = textValue(body.title, 'title', mode === 'create');
  if (title instanceof NextResponse) return title;
  const objectiveId = textValue(body.objectiveId, 'objectiveId', mode === 'create');
  if (objectiveId instanceof NextResponse) return objectiveId;
  const type = enumValue<KeyResultType>(body.type, KEY_RESULT_TYPES, 'type', mode === 'create');
  if (type instanceof NextResponse) return type;
  const status = enumValue<KeyResultStatus>(body.status, KEY_RESULT_STATUSES, 'status');
  if (status instanceof NextResponse) return status;
  const confidence = enumValue<CheckInConfidence>(body.confidence, CHECK_IN_CONFIDENCE, 'confidence');
  if (confidence instanceof NextResponse) return confidence;
  const targetValue = numberValue(body.targetValue, 'targetValue');
  if (targetValue instanceof NextResponse) return targetValue;
  const currentValue = numberValue(body.currentValue, 'currentValue');
  if (currentValue instanceof NextResponse) return currentValue;

  return {
    ...(objectiveId !== undefined ? { objectiveId } : {}),
    ...(title !== undefined ? { title } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(targetValue !== undefined ? { targetValue } : {}),
    ...(currentValue !== undefined ? { currentValue } : {}),
    ...(body.unit !== undefined ? { unit: textValue(body.unit, 'unit') } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(confidence !== undefined ? { confidence } : {}),
  } as KeyResultWriteInput | Partial<KeyResultWriteInput>;
}

export async function parseCheckInInput(request: NextRequest, keyResultId: string) {
  const body = await parseBody(request);
  if (body instanceof NextResponse) return body;
  const confidence = enumValue<CheckInConfidence>(body.confidence, CHECK_IN_CONFIDENCE, 'confidence', true);
  if (confidence instanceof NextResponse) return confidence;
  const progressValue = numberValue(body.progressValue, 'progressValue');
  if (progressValue instanceof NextResponse) return progressValue;

  return {
    keyResultId,
    ...(progressValue !== undefined ? { progressValue } : {}),
    confidence,
    summary: textValue(body.summary, 'summary') ?? null,
    blockers: textValue(body.blockers, 'blockers') ?? null,
    nextActions: textValue(body.nextActions, 'nextActions') ?? null,
  } as CheckInWriteInput;
}

export function getOkrActivityContext(user: AuthedUser): ActivityContext | undefined {
  return user.activityContext;
}
