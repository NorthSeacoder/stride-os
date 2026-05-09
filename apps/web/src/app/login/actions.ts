'use server';

import { redirect } from 'next/navigation';
import { signInWithPassword } from '@/lib/auth/session';

export type LoginFormState = {
  error: string;
};

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const result = await signInWithPassword(email, password);

  if (!result.ok) {
    return { error: result.error };
  }

  redirect('/dashboard');
}
