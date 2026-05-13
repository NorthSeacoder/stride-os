import { LinkButton } from '@/components/ui';

export default function NotFound() {
  return (
    <main className="app-shell-grid flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] px-4 py-12 text-(--text-primary)">
      <div className="metal-frame app-shell-panel w-full max-w-lg rounded-[var(--radius-compact)] p-5 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--text-muted)]">404</p>
        <h1 className="mt-2 text-xl font-semibold tracking-[-0.02em]">页面不存在</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          你访问的资源在当前模板中不可用。
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <LinkButton href="/" variant="secondary">
            首页
          </LinkButton>
          <LinkButton href="/dashboard" variant="primary">
            工作台
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
