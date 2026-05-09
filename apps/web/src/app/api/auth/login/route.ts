import { NextRequest, NextResponse } from 'next/server';
import { getTrimmedString, parseJsonBody } from '../../_lib/validation';
import { signInWithPassword } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) {
    return body;
  }

  const result = await signInWithPassword(
    getTrimmedString(body.email),
    getTrimmedString(body.password),
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true });
}
