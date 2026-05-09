import { getSessionUser } from '@/lib/auth/session';
import Link from 'next/link';

export default async function SettingsPage() {
  const user = await getSessionUser();

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">设置</h1>
      <div className="mt-4 space-y-3">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <h2 className="font-medium text-[var(--text-primary)]">账户</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">邮箱：{user?.email}</p>
          <p className="text-sm text-[var(--text-secondary)]">姓名：{user?.name}</p>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <h2 className="font-medium text-[var(--text-primary)]">API 令牌</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            <Link href="/settings/tokens" className="text-[var(--text-primary)] underline decoration-[var(--border-strong)] underline-offset-2 transition-colors hover:text-[var(--text-primary)]">
              管理 API 令牌
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
