import { NextRequest, NextResponse } from 'next/server';
import { listObjectives } from '@/lib/services/okr-service';
import { requireId, requireOkrApiUser } from '../../../_lib';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOkrApiUser(request);
  if (user instanceof NextResponse) return user;
  const id = await requireId(params, 'Period id');
  if (id instanceof NextResponse) return id;
  return NextResponse.json(await listObjectives(id));
}
