'use server';

import { revalidatePath } from 'next/cache';
import { db, schema } from '@stride-os/db';
import { createExample, deleteExample, updateExample } from '@/lib/services/example-service';
import { getSessionUser } from '@/lib/auth/session';

export type ExampleActionState = {
  error: string;
};

function normalizeExampleInput(formData: FormData) {
  return {
    title: String(formData.get('title') ?? '').trim(),
    status: String(formData.get('status') ?? 'active').trim() || 'active',
    notes: String(formData.get('notes') ?? '').trim(),
  };
}

function revalidateExamples() {
  revalidatePath('/examples');
}

async function requireExamplesUser() {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  return user;
}

export async function createExampleAction(
  _prevState: ExampleActionState,
  formData: FormData,
): Promise<ExampleActionState> {
  const user = await requireExamplesUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { title, status, notes } = normalizeExampleInput(formData);

  if (!title) {
    return { error: 'Title is required' };
  }

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

  revalidateExamples();
  return { error: '' };
}

export async function updateExampleAction(
  _prevState: ExampleActionState,
  formData: FormData,
): Promise<ExampleActionState> {
  const user = await requireExamplesUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  const id = String(formData.get('id') ?? '').trim();
  const { title, status, notes } = normalizeExampleInput(formData);

  if (!id || !title) {
    return { error: 'Title is required' };
  }

  const item = await updateExample(id, {
    title,
    status,
    notes: notes || undefined,
  });

  if (!item) {
    return { error: 'Item not found' };
  }

  await db.insert(schema.auditLogs).values({
    actorType: 'user',
    actorId: user.id,
    action: 'example_item.update',
    targetType: 'example_item',
    targetId: id,
  });

  revalidateExamples();
  return { error: '' };
}

export async function deleteExampleAction(id: string) {
  const user = await requireExamplesUser();
  if (!user) {
    return;
  }

  const deleted = await deleteExample(id);
  if (!deleted) {
    return;
  }

  await db.insert(schema.auditLogs).values({
    actorType: 'user',
    actorId: user.id,
    action: 'example_item.delete',
    targetType: 'example_item',
    targetId: id,
  });

  revalidateExamples();
}
