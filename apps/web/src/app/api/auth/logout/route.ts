import { NextResponse } from 'next/server';
import { getSessionUser, destroySession } from '@/lib/auth/session';

export async function POST() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  await destroySession(user.id);

  return NextResponse.json({ success: true });
}
