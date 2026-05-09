import { randomBytes, createHash } from 'crypto';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { db, schema } from '@stride-os/db';
import { eq } from 'drizzle-orm';
import { env } from '@stride-os/db/env';

const SESSION_COOKIE_NAME = 'session_token';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createSession(userId: string) {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await db.insert(schema.sessions).values({
    userId,
    tokenHash,
    expiresAt,
  });

  await db.insert(schema.auditLogs).values({
    actorType: 'user',
    actorId: userId,
    action: 'auth.login',
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.appUrl.startsWith('https'),
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  return token;
}

export async function destroySession(userId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const tokenHash = hashToken(token);
    await db
      .delete(schema.sessions)
      .where(eq(schema.sessions.tokenHash, tokenHash));

    await db.insert(schema.auditLogs).values({
      actorType: 'user',
      actorId: userId,
      action: 'auth.logout',
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export const getSessionUser = cache(async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await db.query.sessions.findFirst({
    where: eq(schema.sessions.tokenHash, tokenHash),
    with: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) return null;

  return session.user;
});

export async function authenticateUser(email: string, password: string) {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email.trim().toLowerCase()),
  });

  if (!user) return null;

  const { verifyPassword } = await import('@stride-os/db/utils/password');
  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) return null;

  return user;
}

export async function signInWithPassword(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (!normalizedEmail || !normalizedPassword) {
    return {
      ok: false as const,
      error: '邮箱和密码不能为空',
      status: 400,
    };
  }

  const user = await authenticateUser(normalizedEmail, normalizedPassword);

  if (!user) {
    return {
      ok: false as const,
      error: '邮箱或密码错误',
      status: 401,
    };
  }

  await createSession(user.id);

  return {
    ok: true as const,
  };
}
