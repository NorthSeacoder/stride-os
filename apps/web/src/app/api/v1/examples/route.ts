import { NextRequest, NextResponse } from 'next/server';
import { getTrimmedString, parseJsonBody } from '../../_lib/validation';
import { getAuthUser } from '@/lib/auth/api-auth';
import { listExamples, createExample } from '@/lib/services/example-service';
import { db, schema } from '@stride-os/db';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const items = await listExamples();
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) {
    return body;
  }

  const title = getTrimmedString(body.title);
  const status = getTrimmedString(body.status) || 'active';
  const notes = getTrimmedString(body.notes);

  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const item = await createExample({
    title,
    status,
    notes: notes || undefined,
  });
  await db.insert(schema.auditLogs).values({
    actorType: 'user',
    actorId: user.id,
    action: 'example_item.create',
    targetType: 'example_item',
    targetId: item.id,
  });

  return NextResponse.json(item, { status: 201 });
}
