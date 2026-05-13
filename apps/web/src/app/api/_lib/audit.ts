import { db, schema } from '@stride-os/db';

type AuditInput = {
  actorId?: string | null;
  actorType?: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordAuditLog({
  actorId,
  actorType = 'user',
  action,
  targetType,
  targetId,
  metadata,
}: AuditInput) {
  await db.insert(schema.auditLogs).values({
    actorType,
    actorId,
    action,
    targetType,
    targetId,
    metadata,
  });
}
