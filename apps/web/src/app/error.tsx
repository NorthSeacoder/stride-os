'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] px-6 py-24 text-[var(--text-primary)]">
      <div className="w-full max-w-lg rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-6">
        <p className="text-sm font-medium text-[var(--danger-text)]">发生了错误。</p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {error.digest ? `错误参考号：${error.digest}` : '请刷新页面，或重试刚才的操作。'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-4 rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-contrast)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        >
          重试
        </button>
      </div>
    </main>
  );
}
