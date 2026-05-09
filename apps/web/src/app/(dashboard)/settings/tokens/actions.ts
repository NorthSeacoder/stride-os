'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createApiToken, revokeApiToken } from '@/lib/auth/pat';
import { getSessionUser } from '@/lib/auth/session';

const CREATED_TOKEN_COOKIE = 'created_api_token';

export type TokenActionState = {
  error: string;
};

function revalidateTokens() {
  revalidatePath('/settings/tokens');
}

export async function createTokenAction(
  _prevState: TokenActionState,
  formData: FormData,
): Promise<TokenActionState> {
  const user = await getSessionUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  const name = String(formData.get('name') ?? '').trim();
  if (!name) {
    return { error: 'Name is required' };
  }

  const result = await createApiToken(user.id, name);
  const cookieStore = await cookies();
  cookieStore.set(CREATED_TOKEN_COOKIE, result.plainToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/settings/tokens',
    maxAge: 60,
  });

  revalidateTokens();
  redirect('/settings/tokens');
}

export async function revokeTokenAction(id: string) {
  const user = await getSessionUser();
  if (!user) {
    return;
  }

  await revokeApiToken(user.id, id);
  revalidateTokens();
}
