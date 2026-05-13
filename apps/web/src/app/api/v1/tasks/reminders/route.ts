import { NextRequest, NextResponse } from 'next/server';
import { ensureTodayRecurringTasks, listTasksForSource } from '@/lib/services/task-service';
import { addDays, formatDateOnly, requireTaskApiUser } from '../_lib';

type ReminderTask = {
  completedAt?: Date | string | null;
  dueDate?: Date | string | null;
  status?: string | null;
};

function normalizeDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const user = await requireTaskApiUser(request);
  if (user instanceof NextResponse) return user;

  await ensureTodayRecurringTasks();
  const today = request.nextUrl.searchParams.get('today') || formatDateOnly(new Date());
  const to = request.nextUrl.searchParams.get('to') || formatDateOnly(addDays(new Date(`${today}T12:00:00.000Z`), 7));
  const groups = await listTasksForSource('all');
  const tasks = groups.flatMap((group) => group.items);
  const reminders = tasks.filter((task: ReminderTask) => {
    if (task.completedAt || task.status === 'done') return false;
    const dueDate = normalizeDate(task.dueDate);
    return Boolean(dueDate && dueDate <= to);
  });

  return NextResponse.json({ today, to, items: reminders });
}
