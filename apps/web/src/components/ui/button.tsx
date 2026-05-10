'use client';

import { Button as BaseButton } from '@base-ui/react/button';
import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md';

type CommonButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  pending?: boolean;
  children?: ReactNode;
};

type ButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'children'> & CommonButtonProps;

type LinkButtonProps = Omit<ComponentPropsWithoutRef<typeof Link>, 'className'> &
  CommonButtonProps & {
    className?: string;
  };

function buttonClassName({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const base =
    'inline-flex items-center justify-center rounded-md border text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]/30 disabled:cursor-not-allowed disabled:opacity-50';
  const sizes = {
    sm: 'min-h-9 px-3 py-2',
    md: 'min-h-10 px-4 py-2',
  };
  const variants = {
    primary:
      'border-[var(--border-strong)] bg-[var(--bg-panel-strong)] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-panel-contrast)]',
    secondary:
      'border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
    ghost:
      'border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
    danger:
      'border-[var(--danger-border)] bg-transparent text-[var(--danger-text)] hover:bg-[var(--danger-bg)]',
    success:
      'border-[var(--success-border)] bg-transparent text-[var(--success-text)] hover:bg-[var(--success-bg)]',
  };

  return [
    base,
    sizes[size],
    variants[variant],
    fullWidth ? 'w-full' : '',
    disabled ? 'pointer-events-none' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

export function Button({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  pending = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      {...props}
      disabled={disabled || pending}
      type={type}
      className={buttonClassName({ variant, size, fullWidth, disabled: disabled || pending, className })}
    >
      {children}
    </BaseButton>
  );
}

export function LinkButton({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      {...props}
      className={buttonClassName({
        variant,
        size,
        fullWidth,
        className,
      })}
    >
      {children}
    </Link>
  );
}
