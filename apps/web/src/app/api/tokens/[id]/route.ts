import { NextRequest, NextResponse } from 'next/server';
import { requireParam } from '../../_lib/validation';
import { getSessionUser } from '@/lib/auth/session';
import { revokeApiToken } from '@/lib/auth/pat';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const paramError = requireParam(id.trim(), 'Token id');
  if (paramError) return paramError;

  const success = await revokeApiToken(user.id, id);

  if (!success) return NextResponse.json({ error: 'Token not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
