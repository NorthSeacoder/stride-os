import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  const toneClass =
    tone === 'success'
      ? 'border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]'
      : tone === 'warning'
        ? 'border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)]'
        : tone === 'danger'
          ? 'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]'
          : 'border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.04)] text-[var(--text-secondary)]';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${toneClass} ${className}`}
    >
      {children}
    </span>
  );
}
