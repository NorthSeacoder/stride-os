import { NextRequest, NextResponse } from 'next/server';
import { getTrimmedString, parseJsonBody, requireParam } from '../../../_lib/validation';
import { getAuthUser } from '@/lib/auth/api-auth';
import { getExample, updateExample, deleteExample } from '@/lib/services/example-service';
import { db, schema } from '@stride-os/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const paramError = requireParam(id.trim(), 'Example id');
  if (paramError) return paramError;

  const item = await getExample(id);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(item);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const paramError = requireParam(id.trim(), 'Example id');
  if (paramError) return paramError;

  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) {
    return body;
  }

  const title = body.title === undefined ? undefined : getTrimmedString(body.title);
  const status = body.status === undefined ? undefined : getTrimmedString(body.status);
  const notes = body.notes === undefined ? undefined : getTrimmedString(body.notes);

  if (title !== undefined && !title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const item = await updateExample(id, {
    ...(title !== undefined ? { title } : {}),
    ...(status !== undefined ? { status: status || 'active' } : {}),
    ...(notes !== undefined ? { notes } : {}),
  });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.insert(schema.auditLogs).values({
    actorType: 'user',
    actorId: user.id,
    action: 'example_item.update',
    targetType: 'example_item',
    targetId: id,
  });

  return NextResponse.json(item);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const paramError = requireParam(id.trim(), 'Example id');
  if (paramError) return paramError;

  const deleted = await deleteExample(id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.insert(schema.auditLogs).values({
    actorType: 'user',
    actorId: user.id,
    action: 'example_item.delete',
    targetType: 'example_item',
    targetId: id,
  });

  return NextResponse.json({ success: true });
}
