'use server';

import { revalidatePath } from 'next/cache';
import { db, schema } from '@stride-os/db';
import { getSessionUser } from '@/lib/auth/session';
import {
  createKeyResult,
  createKrCheckIn,
  createObjective,
  createPeriod,
  type CheckInConfidence,
  type KeyResultType,
  type ObjectiveStatus,
  type PeriodType,
} from '@/lib/services/okr-service';

export type OkrActionState = {
  error: string;
};

async function requireOkrUser() {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  return user;
}

function revalidateOkr() {
  revalidatePath('/okr');
}

async function writeOkrAudit(userId: string, action: string, targetType: string, targetId: string) {
  await db.insert(schema.auditLogs).values({
    actorType: 'user',
    actorId: userId,
    action,
    targetType,
    targetId,
  });
}

function trimmed(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function nullable(formData: FormData, key: string) {
  const value = trimmed(formData, key);
  return value || null;
}

function nullableNumber(formData: FormData, key: string) {
  const value = trimmed(formData, key);
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createPeriodAction(
  _prevState: OkrActionState,
  formData: FormData,
): Promise<OkrActionState> {
  const user = await requireOkrUser();
  if (!user) {
    return { error: '未授权' };
  }

  try {
    const period = await createPeriod({
      name: trimmed(formData, 'name'),
      type: trimmed(formData, 'type') as PeriodType,
      startDate: trimmed(formData, 'startDate'),
      endDate: trimmed(formData, 'endDate'),
      status: 'active',
    });

    await writeOkrAudit(user.id, 'okr.period.create', 'period', period.id);
    revalidateOkr();
    return { error: '' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : '创建周期失败' };
  }
}

export async function createObjectiveAction(
  _prevState: OkrActionState,
  formData: FormData,
): Promise<OkrActionState> {
  const user = await requireOkrUser();
  if (!user) {
    return { error: '未授权' };
  }

  try {
    const objective = await createObjective({
      periodId: trimmed(formData, 'periodId'),
      title: trimmed(formData, 'title'),
      description: nullable(formData, 'description'),
      status: 'active' as ObjectiveStatus,
      sortOrder: Number(trimmed(formData, 'sortOrder') || '0'),
    });

    await writeOkrAudit(user.id, 'okr.objective.create', 'objective', objective.id);
    revalidateOkr();
    return { error: '' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : '创建目标失败' };
  }
}

export async function createKeyResultAction(
  _prevState: OkrActionState,
  formData: FormData,
): Promise<OkrActionState> {
  const user = await requireOkrUser();
  if (!user) {
    return { error: '未授权' };
  }

  try {
    const keyResult = await createKeyResult({
      objectiveId: trimmed(formData, 'objectiveId'),
      title: trimmed(formData, 'title'),
      type: trimmed(formData, 'type') as KeyResultType,
      targetValue: nullableNumber(formData, 'targetValue'),
      currentValue: nullableNumber(formData, 'currentValue'),
      unit: nullable(formData, 'unit'),
      status: 'active',
      confidence: null,
    });

    await writeOkrAudit(user.id, 'okr.key_result.create', 'key_result', keyResult.id);
    revalidateOkr();
    return { error: '' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : '创建关键结果失败' };
  }
}

export async function createKrCheckInAction(
  _prevState: OkrActionState,
  formData: FormData,
): Promise<OkrActionState> {
  const user = await requireOkrUser();
  if (!user) {
    return { error: '未授权' };
  }

  try {
    const checkIn = await createKrCheckIn({
      keyResultId: trimmed(formData, 'keyResultId'),
      progressValue: nullableNumber(formData, 'progressValue'),
      confidence: trimmed(formData, 'confidence') as CheckInConfidence,
      summary: nullable(formData, 'summary'),
      blockers: nullable(formData, 'blockers'),
      nextActions: nullable(formData, 'nextActions'),
    });

    await writeOkrAudit(user.id, 'okr.check_in.create', 'kr_check_in', checkIn.id);
    revalidateOkr();
    revalidatePath(`/okr/${trimmed(formData, 'keyResultId')}`);
    revalidatePath('/review');
    return { error: '' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : '创建 check-in 失败' };
  }
}
