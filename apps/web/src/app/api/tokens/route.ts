import { NextRequest, NextResponse } from 'next/server';
import { getTrimmedString, parseJsonBody } from '../_lib/validation';
import { getSessionUser } from '@/lib/auth/session';
import { createApiToken, listApiTokens } from '@/lib/auth/pat';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tokens = await listApiTokens(user.id);
  return NextResponse.json(tokens);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) {
    return body;
  }

  const name = getTrimmedString(body.name);
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const result = await createApiToken(user.id, name);
  return NextResponse.json(result, { status: 201 });
}
