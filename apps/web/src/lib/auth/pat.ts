import { randomBytes, createHash } from 'crypto';
import { db, schema } from '@stride-os/db';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { buildWebActivityContext, type ActivityContext } from '@/lib/services/activity-service';

type ApiTokenMutationOptions = {
  activityContext?: ActivityContext;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return `tpl_${randomBytes(32).toString('hex')}`;
}

function webContext(userId: string) {
  return buildWebActivityContext({
    userId,
    actorLabel: 'You',
  });
}

export async function createApiToken(userId: string, name: string, options: ApiTokenMutationOptions = {}) {
  const plainToken = generateToken();
  const tokenHash = hashToken(plainToken);

  const [tokenRecord] = await db.insert(schema.apiTokens).values({
    userId,
    name,
    tokenHash,
  }).returning({ id: schema.apiTokens.id });

  const tokenId = tokenRecord?.id ?? null;
  const activityContext = options.activityContext ?? webContext(userId);

  await db.insert(schema.auditLogs).values({
    actorType: activityContext.actorType,
    actorId: activityContext.actorId ?? userId,
    action: 'token.create',
    targetType: 'api_token',
    targetId: tokenId,
    targetTitle: name,
    source: activityContext.source,
    summary: `Created API token ${name}`,
    metadata: {
      actorLabel: activityContext.actorLabel ?? undefined,
      sourceLabel: activityContext.sourceLabel ?? undefined,
      requestId: activityContext.requestId ?? undefined,
      command: activityContext.command ?? undefined,
    },
  });

  return { plainToken };
}

export async function listApiTokens(userId: string) {
  return db.query.apiTokens.findMany({
    where: and(
      eq(schema.apiTokens.userId, userId),
      isNull(schema.apiTokens.revokedAt),
    ),
    columns: {
      id: true,
      name: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
      revokedAt: true,
    },
    orderBy: [desc(schema.apiTokens.createdAt)],
  });
}

export async function revokeApiToken(userId: string, tokenId: string, options: ApiTokenMutationOptions = {}) {
  const token = await db.query.apiTokens.findFirst({
    where: and(
      eq(schema.apiTokens.id, tokenId),
      eq(schema.apiTokens.userId, userId),
    ),
  });

  if (!token) return false;
  const activityContext = options.activityContext ?? webContext(userId);

  await db
    .update(schema.apiTokens)
    .set({ revokedAt: new Date() })
    .where(eq(schema.apiTokens.id, tokenId));

  await db.insert(schema.auditLogs).values({
    actorType: activityContext.actorType,
    actorId: activityContext.actorId ?? userId,
    action: 'token.revoke',
    targetType: 'api_token',
    targetId: tokenId,
    targetTitle: token.name,
    source: activityContext.source,
    summary: `Revoked API token ${token.name}`,
    metadata: {
      actorLabel: activityContext.actorLabel ?? undefined,
      sourceLabel: activityContext.sourceLabel ?? undefined,
      requestId: activityContext.requestId ?? undefined,
      command: activityContext.command ?? undefined,
    },
  });

  return true;
}

export async function validateBearerToken(token: string) {
  const tokenHash = hashToken(token);
  const record = await db.query.apiTokens.findFirst({
    where: eq(schema.apiTokens.tokenHash, tokenHash),
    with: { user: true },
  });

  if (!record) return null;
  if (record.revokedAt) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;

  await db
    .update(schema.apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiTokens.id, record.id));

  return record.user;
}
