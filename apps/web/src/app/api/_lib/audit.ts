import { recordActivity, type ActivityContext, type ActivityMetadata } from '@/lib/services/activity-service';

type AuditInput = {
  activityContext?: ActivityContext;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  targetTitle?: string | null;
  source?: string | null;
  summary?: string | null;
  metadata?: ActivityMetadata;
};

export async function recordAuditLog({
  activityContext,
  action,
  targetType,
  targetId,
  targetTitle,
  source,
  summary,
  metadata,
}: AuditInput) {
  await recordActivity({
    actorType: activityContext?.actorType ?? 'user',
    actorId: activityContext?.actorId ?? null,
    action,
    targetType,
    targetId,
    targetTitle,
    source: source ?? activityContext?.source ?? null,
    summary,
    metadata,
  });
}
