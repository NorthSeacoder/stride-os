import { LinkButton } from '@/components/ui';

export default function HomePage() {
  return (
    <main className="app-shell-grid flex min-h-screen flex-col items-center justify-center bg-[var(--bg-canvas)] px-4 py-12 text-(--text-primary)">
      <section className="metal-frame app-shell-panel w-full max-w-xl rounded-[var(--radius-panel)] px-5 py-6 text-center sm:px-6 sm:py-7">
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">Stride OS</p>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-(--text-primary)">OKR TASK</h1>
          </div>

          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <LinkButton href="/dashboard" variant="primary">
              工作台
            </LinkButton>
            <LinkButton href="/api/health" variant="secondary">
              健康检查
            </LinkButton>
            <LinkButton href="/llm.txt" variant="secondary">
              LLM 入口
            </LinkButton>
          </div>
        </div>
      </section>
    </main>
  );
}
