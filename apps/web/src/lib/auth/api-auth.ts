import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { validateBearerToken } from '@/lib/auth/pat';
import {
  buildApiActivityContext,
  buildWebActivityContext,
  type ActivityAuthenticatedUser,
} from '@/lib/services/activity-service';

export async function getAuthUser(request: NextRequest): Promise<ActivityAuthenticatedUser | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const user = await validateBearerToken(token);
    if (!user) {
      return null;
    }

    return {
      ...user,
      activityContext: buildApiActivityContext({
        actorType: 'user',
        actorId: user.id,
        trustedSource: request.headers.get('x-stride-source'),
        trustedSourceLabel: request.headers.get('x-stride-source-label'),
        requestId: request.headers.get('x-request-id'),
        command: request.headers.get('x-stride-command'),
      }),
    };
  }

  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  return {
    ...user,
    activityContext: buildWebActivityContext({
      userId: user.id,
      actorLabel: 'You',
    }),
  };
}
