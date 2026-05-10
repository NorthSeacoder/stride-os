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
    'inline-flex items-center justify-center rounded-[var(--radius-compact)] border text-sm outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]/30 disabled:cursor-not-allowed disabled:opacity-50';
  const sizes = {
    sm: 'min-h-9 px-3 py-2',
    md: 'min-h-10 px-4 py-2.5',
  };
  const variants = {
    primary:
      'border-[var(--border-glow)] bg-[var(--bg-surface-3)] font-medium text-[var(--accent-ice-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-[color:rgba(69,77,91,0.98)] hover:text-white',
    secondary:
      'border-[var(--border-hairline)] bg-[var(--bg-surface-1)] text-[var(--text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[var(--border-glow)] hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]',
    ghost:
      'border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[color:rgba(255,255,255,0.04)] hover:text-[var(--text-primary)]',
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
