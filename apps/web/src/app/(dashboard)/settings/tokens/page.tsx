import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth/session';
import { listApiTokens } from '@/lib/auth/pat';
import { TokensClient } from './tokens-client';

const CREATED_TOKEN_COOKIE = 'created_api_token';

export default async function TokensPage() {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const cookieStore = await cookies();
  const tokens = await listApiTokens(user.id);
  const createdToken = cookieStore.get(CREATED_TOKEN_COOKIE)?.value ?? null;

  if (createdToken) {
    cookieStore.delete(CREATED_TOKEN_COOKIE);
  }

  return <TokensClient tokens={tokens} createdToken={createdToken} />;
}
