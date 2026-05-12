import type { HTMLAttributes, ReactNode } from 'react';

export function SurfacePanel({
  children,
  className = '',
  emphasis = 'default',
  ...props
}: HTMLAttributes<HTMLElement> & {
  emphasis?: 'default' | 'strong';
}) {
  const surfaceClass = emphasis === 'strong' ? 'app-shell-panel-strong' : 'app-shell-panel';

  return (
    <section
      {...props}
      className={`min-w-0 rounded-[var(--radius-panel)] ${surfaceClass} ${className}`.trim()}
    >
      {children}
    </section>
  );
}

export function AsidePanel({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <aside
      {...props}
      className={`min-w-0 rounded-[var(--radius-panel)] app-shell-panel ${className}`.trim()}
    >
      {children}
    </aside>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className = '',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`.trim()}>
      <div>
        {eyebrow && <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">{eyebrow}</p>}
        <h2 className="mt-2 text-lg font-semibold text-(--text-primary)">{title}</h2>
        {description && <p className="mt-1 text-sm text-(--text-secondary)">{description}</p>}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && <p className="text-xs uppercase tracking-[0.24em] text-(--text-muted)">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-(--text-primary)">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-(--text-secondary)">{description}</p>}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
