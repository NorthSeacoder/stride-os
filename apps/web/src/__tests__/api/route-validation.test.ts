import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/session', () => ({
  signInWithPassword: vi.fn(async (email: string, password: string) => {
    if (!email || !password) {
      return { ok: false as const, error: 'Email and password are required', status: 400 };
    }

    return { ok: true as const };
  }),
  getSessionUser: vi.fn(async () => ({ id: 'user_1', email: 'admin@example.com', name: 'Admin' })),
}));

vi.mock('@/lib/auth/api-auth', () => ({
  getAuthUser: vi.fn(async (request: NextRequest) => {
    return request.headers.get('authorization') ? { id: 'user_1' } : null;
  }),
}));

vi.mock('@/lib/auth/pat', () => ({
  createApiToken: vi.fn(async () => ({ plainToken: 'tpl_created' })),
  listApiTokens: vi.fn(async () => []),
  revokeApiToken: vi.fn(async () => true),
}));

vi.mock('@/lib/services/example-service', () => ({
  createExample: vi.fn(async (data: Record<string, unknown>) => ({ id: 'ex_1', ...data })),
  deleteExample: vi.fn(async () => true),
  getExample: vi.fn(async () => null),
  listExamples: vi.fn(async () => []),
  updateExample: vi.fn(async (id: string, data: Record<string, unknown>) => ({ id, ...data })),
}));

vi.mock('@stride-os/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(async () => undefined),
    })),
  },
  schema: {
    auditLogs: {},
  },
}));

import { POST as loginPost } from '@/app/api/auth/login/route';
import { POST as tokensPost } from '@/app/api/tokens/route';
import { POST as examplesPost } from '@/app/api/v1/examples/route';
import { PATCH as examplePatch } from '@/app/api/v1/examples/[id]/route';
import { apiError, conflict, notFound, unauthorized } from '@/app/api/_lib/validation';
import { recordAuditLog } from '@/app/api/_lib/audit';
import { expectJsonError, jsonRequest } from './helpers';

describe('route handler validation boundaries', () => {
  it('returns 400 for invalid JSON in login route', async () => {
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    });

    const response = await loginPost(request);
    await expectJsonError(response, 400, 'Invalid JSON body');
  });

  it('returns 400 for blank token name', async () => {
    const request = jsonRequest('http://localhost/api/tokens', {
      body: { name: '   ' },
    });

    const response = await tokensPost(request);
    await expectJsonError(response, 400, 'Name is required');
  });

  it('returns 400 for blank example title in create route', async () => {
    const request = jsonRequest('http://localhost/api/v1/examples', {
      auth: 'tpl_fake',
      body: { title: '   ' },
    });

    const response = await examplesPost(request);
    await expectJsonError(response, 400, 'Title is required');
  });

  it('returns 400 for blank example id in patch route', async () => {
    const request = new NextRequest('http://localhost/api/v1/examples/%20', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: 'Bearer tpl_fake' },
      body: JSON.stringify({ title: 'Updated' }),
    });

    const response = await examplePatch(request, {
      params: Promise.resolve({ id: '   ' }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Example id is required' });
  });

  it('provides shared JSON error helpers', async () => {
    await expectJsonError(unauthorized(), 401, 'Unauthorized');
    await expectJsonError(notFound('Task not found'), 404, 'Task not found');
    await expectJsonError(conflict('Task already archived'), 409, 'Task already archived');
    await expectJsonError(apiError('Custom error', 418), 418, 'Custom error');
  });

  it('records audit logs through a shared helper', async () => {
    await recordAuditLog({
      actorId: 'user_1',
      action: 'task.create',
      targetType: 'task',
      targetId: 'task_1',
      metadata: { source: 'api' },
    });

    const { db, schema } = await import('@stride-os/db');
    expect(db.insert).toHaveBeenCalledWith(schema.auditLogs);
  });
});
