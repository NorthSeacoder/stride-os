import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/api-auth';
import { badRequest, getTrimmedString, parseJsonBody, unauthorized } from '../../_lib/validation';
import { type ActivityAuthenticatedUser, type ActivityContext } from '@/lib/services/activity-service';
import {
  createTaskList,
  listTaskListsWithCounts,
} from '@/lib/services/task-service';

const TASK_LIST_KINDS = ['system', 'user'] as const;
type TaskListKind = typeof TASK_LIST_KINDS[number];

type AuthedUser = ActivityAuthenticatedUser;

export async function requireTaskListApiUser(request: NextRequest): Promise<AuthedUser | NextResponse> {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();
  return user as AuthedUser;
}

export function getTaskListActivityContext(user: AuthedUser): ActivityContext | undefined {
  return user.activityContext;
}

export async function POST(request: NextRequest) {
  const user = await requireTaskListApiUser(request);
  if (user instanceof NextResponse) return user;

  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) return body;

  const name = getTrimmedString(body.name);
  if (!name) return badRequest('name is required');

  const kind = (() => {
    if (body.kind === undefined || body.kind === null) return undefined;
    const normalized = getTrimmedString(body.kind);
    if (!TASK_LIST_KINDS.includes(normalized as TaskListKind)) return badRequest('kind is invalid');
    return normalized as TaskListKind;
  })();
  if (kind instanceof NextResponse) return kind;

  const icon = body.icon !== undefined ? getTrimmedString(body.icon) || null : undefined;
  const slug = body.slug !== undefined ? getTrimmedString(body.slug) || null : undefined;

  try {
    const taskList = await createTaskList({
      name,
      ...(icon !== undefined ? { icon } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(kind !== undefined ? { kind } : {}),
    });
    return NextResponse.json(taskList, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid task list' },
      { status: 400 },
    );
  }
}

export async function GET(request: NextRequest) {
  const user = await requireTaskListApiUser(request);
  if (user instanceof NextResponse) return user;

  const lists = await listTaskListsWithCounts();
  return NextResponse.json(lists);
}
