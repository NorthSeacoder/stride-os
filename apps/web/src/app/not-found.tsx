import { LinkButton } from '@/components/ui';

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
