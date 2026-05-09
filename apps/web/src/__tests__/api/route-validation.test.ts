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

describe('route handler validation boundaries', () => {
  it('returns 400 for invalid JSON in login route', async () => {
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    });

    const response = await loginPost(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid JSON body' });
  });

  it('returns 400 for blank token name', async () => {
    const request = new NextRequest('http://localhost/api/tokens', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '   ' }),
    });

    const response = await tokensPost(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Name is required' });
  });

  it('returns 400 for blank example title in create route', async () => {
    const request = new NextRequest('http://localhost/api/v1/examples', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer tpl_fake' },
      body: JSON.stringify({ title: '   ' }),
    });

    const response = await examplesPost(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Title is required' });
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
});
