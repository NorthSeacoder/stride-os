import { randomBytes, createHash } from 'crypto';
import { db, schema } from '@stride-os/db';
import { eq, and, isNull, desc } from 'drizzle-orm';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return `tpl_${randomBytes(32).toString('hex')}`;
}

export async function createApiToken(userId: string, name: string) {
  const plainToken = generateToken();
  const tokenHash = hashToken(plainToken);

  await db.insert(schema.apiTokens).values({
    userId,
    name,
    tokenHash,
  });

  await db.insert(schema.auditLogs).values({
    actorType: 'user',
    actorId: userId,
    action: 'token.create',
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

export async function revokeApiToken(userId: string, tokenId: string) {
  const token = await db.query.apiTokens.findFirst({
    where: and(
      eq(schema.apiTokens.id, tokenId),
      eq(schema.apiTokens.userId, userId),
    ),
  });

  if (!token) return false;

  await db
    .update(schema.apiTokens)
    .set({ revokedAt: new Date() })
    .where(eq(schema.apiTokens.id, tokenId));

  await db.insert(schema.auditLogs).values({
    actorType: 'user',
    actorId: userId,
    action: 'token.revoke',
    targetType: 'api_token',
    targetId: tokenId,
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
