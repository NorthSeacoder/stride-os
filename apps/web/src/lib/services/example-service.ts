import { db, schema } from '@stride-os/db';
import { eq, desc } from 'drizzle-orm';

export async function listExamples() {
  return db.query.exampleItems.findMany({
    orderBy: [desc(schema.exampleItems.createdAt)],
  });
}

export async function getExample(id: string) {
  return db.query.exampleItems.findFirst({
    where: eq(schema.exampleItems.id, id),
  });
}

export async function createExample(data: { title: string; status?: string; notes?: string }) {
  const [item] = await db.insert(schema.exampleItems).values(data).returning();
  return item;
}

export async function updateExample(
  id: string,
  data: Partial<{ title: string; status: string; notes: string }>
) {
  const [item] = await db
    .update(schema.exampleItems)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.exampleItems.id, id))
    .returning();
  return item ?? null;
}

export async function deleteExample(id: string) {
  const [item] = await db
    .delete(schema.exampleItems)
    .where(eq(schema.exampleItems.id, id))
    .returning({ id: schema.exampleItems.id });
  return !!item;
}
