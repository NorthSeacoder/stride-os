'use client';

import type { AnyFieldApi } from '@tanstack/react-form';
import type { ReactNode } from 'react';

type FormFieldShellProps = {
  label: string;
  description?: string;
  error?: string;
  children: ReactNode;
};

export function FormFieldShell({
  label,
  description,
  error,
  children,
}: FormFieldShellProps) {
  return (
    <div className="block">
      <div className="mb-1 text-sm text-(--text-secondary)">{label}</div>
      {children}
      {description ? <p className="mt-1 text-xs text-(--text-muted)">{description}</p> : null}
      {error ? <p className="mt-1 text-xs text-(--danger-text)">{error}</p> : null}
    </div>
  );
}

export function getFieldError(field: Pick<AnyFieldApi, 'state'>) {
  const metaErrors = field.state.meta.errors;
  if (!field.state.meta.isTouched || metaErrors.length === 0) {
    return '';
  }

  const firstError = metaErrors[0];
  return typeof firstError === 'string' ? firstError : String(firstError ?? '');
}

export function ActionStatus({
  pending,
  idleLabel = '未提交',
  pendingLabel = '提交中',
}: {
  pending: boolean;
  idleLabel?: string;
  pendingLabel?: string;
}) {
  return (
    <span className="text-xs text-(--text-muted)">
      {pending ? pendingLabel : idleLabel}
    </span>
  );
}
