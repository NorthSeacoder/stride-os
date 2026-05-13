import { expect } from 'vitest';
import { NextRequest } from 'next/server';

type JsonRequestOptions = {
  auth?: string;
  body?: unknown;
  headers?: Record<string, string>;
  method?: string;
};

export function bearerHeaders(token = 'ok') {
  return { authorization: `Bearer ${token}` };
}

export function jsonRequest(url: string, options: JsonRequestOptions = {}) {
  const method = options.method ?? (options.body === undefined ? 'GET' : 'POST');
  const headers = {
    ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
    ...(options.auth ? bearerHeaders(options.auth) : {}),
    ...options.headers,
  };

  return new NextRequest(url, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

export async function expectJsonError(response: Response, status: number, error: string) {
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ error });
}
