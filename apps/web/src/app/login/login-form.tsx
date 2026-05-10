'use client';

import { Button, ErrorAlert, TextField } from '@/components/ui';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { loginAction, type LoginFormState } from './actions';

const initialState: LoginFormState = {
  error: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="primary"
      fullWidth
      pending={pending}
    >
      {pending ? '登录中...' : '登录'}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <ErrorAlert message={state.error} />}

      <TextField id="email" name="email" label="邮箱" type="email" required autoComplete="email" />

      <TextField
        id="password"
        name="password"
        label="密码"
        type="password"
        required
        autoComplete="current-password"
      />

      <SubmitButton />
    </form>
  );
}
