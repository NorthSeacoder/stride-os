import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/api-auth';
import { recordAuditLog } from '../../_lib/audit';
import { badRequest, getTrimmedString, parseJsonBody, requireParam, unauthorized } from '../../_lib/validation';

export const REVIEW_CONTEXT_TYPES = ['daily', 'weekly', 'monthly', 'period'] as const;

export type ReviewContextType = typeof REVIEW_CONTEXT_TYPES[number];

type AuthedUser = { id: string };

export async function requireReviewApiUser(request: NextRequest): Promise<AuthedUser | NextResponse> {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();
  return user as AuthedUser;
}

export async function requireReviewId(params: Promise<{ id: string }>) {
  const { id } = await params;
  const reviewId = id.trim();
  const error = requireParam(reviewId, 'Review id');
  return error ?? reviewId;
}

export async function parseReviewPatchRequest(request: NextRequest) {
  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) return body;

  const status = body.status === undefined ? undefined : getTrimmedString(body.status);
  const title = body.title === undefined ? undefined : getTrimmedString(body.title);
  const bodyText = body.body === undefined ? undefined : getTrimmedString(body.body);
  const structuredSummary = body.structuredSummary && typeof body.structuredSummary === 'object'
    ? body.structuredSummary as Record<string, unknown>
    : undefined;

  if (status !== undefined && status !== 'final') return badRequest('status is invalid');
  if (title !== undefined && !title) return badRequest('Title is required');
  if (bodyText !== undefined && !bodyText) return badRequest('Body is required');

  return {
    status,
    ...(title !== undefined ? { title } : {}),
    ...(bodyText !== undefined ? { body: bodyText } : {}),
    ...(structuredSummary !== undefined ? { structuredSummary } : {}),
  };
}

function formatDateOnly(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseReviewContextRange(searchParams: URLSearchParams, now = new Date()) {
  const type = searchParams.get('type')?.trim() || 'daily';
  if (!REVIEW_CONTEXT_TYPES.includes(type as ReviewContextType)) {
    return badRequest('type is invalid');
  }

  const start = searchParams.get('start')?.trim() || '';
  const end = searchParams.get('end')?.trim() || '';

  if (!start && !end && type === 'daily') {
    const today = formatDateOnly(now);
    return { type: type as ReviewContextType, periodStart: today, periodEnd: today };
  }

  if (!start || !end) {
    return badRequest('start and end are required');
  }

  if (!isDateOnly(start) || !isDateOnly(end)) {
    return badRequest('start and end must be YYYY-MM-DD dates');
  }

  if (end < start) {
    return badRequest('end must be on or after start');
  }

  return { type: type as ReviewContextType, periodStart: start, periodEnd: end };
}

export async function recordReviewAudit(userId: string, action: string, reviewId?: string | null, metadata?: Record<string, unknown>) {
  await recordAuditLog({
    actorId: userId,
    action,
    targetType: 'review',
    targetId: reviewId,
    metadata,
  });
}
