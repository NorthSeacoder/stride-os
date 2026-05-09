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
        <p className="text-sm font-medium text-[var(--danger-text)]">Something went wrong.</p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {error.digest ? `Error reference: ${error.digest}` : 'Try refreshing or retrying the action.'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-4 rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-contrast)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
