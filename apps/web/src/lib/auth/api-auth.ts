import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { validateBearerToken } from '@/lib/auth/pat';

export async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return validateBearerToken(token);
  }

  return getSessionUser();
}
