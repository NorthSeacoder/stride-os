import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] px-6 py-24 text-[var(--text-primary)]">
      <div className="w-full max-w-lg rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-6 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--text-muted)]">404</p>
        <h1 className="mt-3 text-2xl font-bold">页面不存在</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          你访问的资源在当前模板中不可用。
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-panel)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          >
            首页
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-contrast)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          >
            工作台
          </Link>
        </div>
      </div>
    </main>
  );
}
