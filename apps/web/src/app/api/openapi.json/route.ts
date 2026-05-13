import { NextResponse } from 'next/server';
import { v1Spec } from '@stride-os/api-contract';

export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json(v1Spec, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
