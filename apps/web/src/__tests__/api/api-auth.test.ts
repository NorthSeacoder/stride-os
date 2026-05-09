import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth/api-auth';

const getSessionUser = vi.fn();
const validateBearerToken = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: () => getSessionUser(),
}));

vi.mock('@/lib/auth/pat', () => ({
  validateBearerToken: (...args: unknown[]) => validateBearerToken(...args),
}));

describe('api auth header parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts bearer token from authorization header', () => {
    const req = new NextRequest('http://localhost/api/v1/me', {
      headers: { authorization: 'Bearer tpl_abc123' },
    });
    const authHeader = req.headers.get('authorization');
    expect(authHeader?.startsWith('Bearer ')).toBe(true);
    expect(authHeader?.slice(7)).toBe('tpl_abc123');
  });

  it('returns null when no auth header is present', () => {
    const req = new NextRequest('http://localhost/api/v1/me');
    expect(req.headers.get('authorization')).toBeNull();
  });

  it('authenticates through bearer token when authorization header exists', async () => {
    validateBearerToken.mockResolvedValue({ id: 'user_pat' });

    const req = new NextRequest('http://localhost/api/v1/me', {
      headers: { authorization: 'Bearer tpl_live' },
    });

    await expect(getAuthUser(req)).resolves.toEqual({ id: 'user_pat' });
    expect(validateBearerToken).toHaveBeenCalledWith('tpl_live');
    expect(getSessionUser).not.toHaveBeenCalled();
  });

  it('falls back to session user when bearer token is absent', async () => {
    getSessionUser.mockResolvedValue({ id: 'user_cookie' });

    const req = new NextRequest('http://localhost/api/v1/me');

    await expect(getAuthUser(req)).resolves.toEqual({ id: 'user_cookie' });
    expect(getSessionUser).toHaveBeenCalled();
  });
});
