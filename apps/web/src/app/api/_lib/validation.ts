import { NextResponse } from 'next/server';

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function parseJsonBody(request: Request): Promise<Record<string, unknown> | NextResponse> {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return badRequest('Invalid JSON body');
    }

    return body as Record<string, unknown>;
  } catch {
    return badRequest('Invalid JSON body');
  }
}

export function getTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function requireParam(value: string, name: string) {
  if (!value) {
    return badRequest(`${name} is required`);
  }

  return null;
}
