import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-canvas)] px-6 py-24 text-[var(--text-primary)]">
      <div className="max-w-lg space-y-6 text-center">
        <h1 className="text-4xl font-bold text-[var(--text-primary)]">Stride OS</h1>
        <p className="text-lg text-[var(--text-secondary)]">
          面向个人 OKR 执行、规划与复盘流程的自托管 Agent Native 操作系统。
        </p>
        <div className="flex flex-col gap-3 justify-center sm:flex-row sm:gap-4">
          <Link
            href="/dashboard"
            className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel-strong)] px-6 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-contrast)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          >
            工作台
          </Link>
          <a
            href="/api/health"
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-6 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-panel)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          >
            健康检查
          </a>
        </div>
        <div className="pt-8 text-sm text-[var(--text-secondary)] space-y-1">
          <p>本地优先使用 SQLite，部署环境支持 PostgreSQL</p>
          <p>支持会话登录与个人访问令牌</p>
          <p>提供面向 Hermes 集成的 OpenAPI v1 基础能力</p>
        </div>
      </div>
    </main>
  );
}
