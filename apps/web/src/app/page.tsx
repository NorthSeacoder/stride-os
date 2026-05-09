import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-canvas)] px-6 py-24 text-[var(--text-primary)]">
      <div className="max-w-lg space-y-6 text-center">
        <h1 className="text-4xl font-bold text-[var(--text-primary)]">Stride OS</h1>
        <p className="text-lg text-[var(--text-secondary)]">
          A self-hosted, agent-native operating system for personal OKR
          execution, planning, and review workflows.
        </p>
        <div className="flex flex-col gap-3 justify-center sm:flex-row sm:gap-4">
          <Link
            href="/dashboard"
            className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel-strong)] px-6 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-contrast)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          >
            Dashboard
          </Link>
          <a
            href="/api/health"
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-6 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-panel)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          >
            Health Check
          </a>
        </div>
        <div className="pt-8 text-sm text-[var(--text-secondary)] space-y-1">
          <p>SQLite-first local setup, PostgreSQL for deployment</p>
          <p>Session auth + Personal Access Tokens</p>
          <p>OpenAPI v1 foundation for Hermes integration</p>
        </div>
      </div>
    </main>
  );
}
