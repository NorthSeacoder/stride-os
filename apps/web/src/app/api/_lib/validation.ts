import { NextResponse } from 'next/server';

export function apiJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function apiError(error: string, status: number) {
  return apiJson({ error }, { status });
}

export function unauthorized(error = 'Unauthorized') {
  return apiError(error, 401);
}

export function badRequest(error: string) {
  return apiError(error, 400);
}

export function notFound(error = 'Not found') {
  return apiError(error, 404);
}

export function conflict(error: string) {
  return apiError(error, 409);
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
