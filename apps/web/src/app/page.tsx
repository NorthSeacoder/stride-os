import { LinkButton } from '@/components/ui';

export default function HomePage() {
  return (
    <main className="app-shell-grid flex min-h-screen flex-col items-center justify-center bg-[var(--bg-canvas)] px-4 py-12 text-(--text-primary)">
      <div className="metal-frame app-shell-panel max-w-lg space-y-4 rounded-[var(--radius-compact)] px-5 py-5 text-center">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-(--text-primary)">Stride OS</h1>
        <p className="text-sm leading-6 text-(--text-secondary)">
          面向个人 OKR 执行、规划与复盘流程的自托管 Agent Native 操作系统。
        </p>
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <LinkButton href="/dashboard" variant="primary">
            工作台
          </LinkButton>
          <LinkButton href="/api/health" variant="secondary">
            健康检查
          </LinkButton>
        </div>
        <div className="space-y-1 border-t border-(--border-hairline) pt-3 text-xs text-(--text-secondary)">
          <p>本地优先使用 SQLite，部署环境支持 PostgreSQL</p>
          <p>支持会话登录与个人访问令牌</p>
          <p>提供面向 Hermes 集成的 OpenAPI v1 基础能力</p>
        </div>
      </div>
    </main>
  );
}
