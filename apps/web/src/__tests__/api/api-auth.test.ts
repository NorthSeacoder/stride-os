import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';

describe('api auth header parsing', () => {
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
});
