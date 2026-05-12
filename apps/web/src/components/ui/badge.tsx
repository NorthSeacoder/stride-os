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
      ? 'border-(--success-border) bg-(--success-bg) text-(--success-text)'
      : tone === 'warning'
        ? 'border-(--warning-border) bg-(--warning-bg) text-(--warning-text)'
        : tone === 'danger'
          ? 'border-(--danger-border) bg-(--danger-bg) text-(--danger-text)'
          : 'border-(--border-hairline) bg-[color:rgba(255,255,255,0.04)] text-(--text-secondary)';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${toneClass} ${className}`}
    >
      {children}
    </span>
  );
}
