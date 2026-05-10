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
      ? 'bg-[var(--success-bg)] text-[var(--success-text)]'
      : tone === 'warning'
        ? 'bg-[var(--warning-bg)] text-[var(--warning-text)]'
        : tone === 'danger'
          ? 'bg-[var(--danger-bg)] text-[var(--danger-text)]'
          : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]';

  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${toneClass} ${className}`}>{children}</span>;
}
