'use server';

import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/auth/session';
import { buildWebActivityContext } from '@/lib/services/activity-service';
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

  return {
    ...user,
    activityContext: buildWebActivityContext({
      userId: user.id,
      actorLabel: 'You',
    }),
  };
}

function revalidateOkr() {
  revalidatePath('/okr');
  revalidatePath('/activity');
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
    await createPeriod({
      name: trimmed(formData, 'name'),
      type: trimmed(formData, 'type') as PeriodType,
      startDate: trimmed(formData, 'startDate'),
      endDate: trimmed(formData, 'endDate'),
      status: 'active',
    }, { activityContext: user.activityContext });
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
    await createObjective({
      periodId: trimmed(formData, 'periodId'),
      title: trimmed(formData, 'title'),
      description: nullable(formData, 'description'),
      status: 'active' as ObjectiveStatus,
      sortOrder: Number(trimmed(formData, 'sortOrder') || '0'),
    }, { activityContext: user.activityContext });
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
    await createKeyResult({
      objectiveId: trimmed(formData, 'objectiveId'),
      title: trimmed(formData, 'title'),
      type: trimmed(formData, 'type') as KeyResultType,
      targetValue: nullableNumber(formData, 'targetValue'),
      currentValue: nullableNumber(formData, 'currentValue'),
      unit: nullable(formData, 'unit'),
      status: 'active',
      confidence: null,
    }, { activityContext: user.activityContext });
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
    await createKrCheckIn({
      keyResultId: trimmed(formData, 'keyResultId'),
      progressValue: nullableNumber(formData, 'progressValue'),
      confidence: trimmed(formData, 'confidence') as CheckInConfidence,
      summary: nullable(formData, 'summary'),
      blockers: nullable(formData, 'blockers'),
      nextActions: nullable(formData, 'nextActions'),
    }, { activityContext: user.activityContext });
    revalidateOkr();
    revalidatePath(`/okr/${trimmed(formData, 'keyResultId')}`);
    revalidatePath('/review');
    return { error: '' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : '创建 check-in 失败' };
  }
}
