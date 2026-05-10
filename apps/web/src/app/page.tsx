import { LinkButton } from '@/components/ui';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-canvas)] px-6 py-24 text-[var(--text-primary)]">
      <div className="max-w-lg space-y-6 text-center">
        <h1 className="text-4xl font-bold text-[var(--text-primary)]">Stride OS</h1>
        <p className="text-lg text-[var(--text-secondary)]">
          面向个人 OKR 执行、规划与复盘流程的自托管 Agent Native 操作系统。
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
          <LinkButton href="/dashboard" variant="primary" className="px-6 py-2.5">
            工作台
          </LinkButton>
          <LinkButton href="/api/health" variant="secondary" className="px-6 py-2.5">
            健康检查
          </LinkButton>
        </div>
        <div className="space-y-1 pt-8 text-sm text-[var(--text-secondary)]">
          <p>本地优先使用 SQLite，部署环境支持 PostgreSQL</p>
          <p>支持会话登录与个人访问令牌</p>
          <p>提供面向 Hermes 集成的 OpenAPI v1 基础能力</p>
        </div>
      </div>
    </main>
  );
}
