import { Button } from '@/components/ui';
import { getSessionUser } from '@/lib/auth/session';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardShellNav } from './dashboard-shell-nav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[var(--bg-shell)] px-3 py-3 text-[var(--text-primary)] md:px-4 md:py-4">
      <div className="app-shell-grid app-shell-panel min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-[var(--radius-shell)] md:min-h-[calc(100vh-2rem)]">
        <div className="grid min-h-full lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-b app-shell-divider bg-[var(--bg-sidebar)] px-4 py-4 backdrop-blur-xl lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
            <div className="flex items-center justify-between lg:block">
              <div>
                <p className="text-[11px] uppercase tracking-[0.26em] text-[var(--text-muted)]">Stride OS</p>
                <Link href="/dashboard" className="mt-2 block text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  Aluminum Workstation
                </Link>
                <p className="mt-2 max-w-[16rem] text-sm text-[var(--text-secondary)]">
                  目标、执行、象限与复盘汇聚到同一张操作台。
                </p>
              </div>
              <form action="/api/auth/logout" method="POST" className="lg:hidden">
                <Button type="submit" variant="ghost" size="sm">
                  退出
                </Button>
              </form>
            </div>

            <div className="mt-6">
              <DashboardShellNav />
            </div>

            <div className="mt-6 hidden rounded-[18px] border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] p-4 lg:block">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Current User</p>
              <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{user.name ?? '未命名用户'}</p>
              <p className="mt-1 break-all text-sm text-[var(--text-secondary)]">{user.email}</p>
            </div>
          </aside>

          <div className="min-w-0">
            <header className="border-b app-shell-divider bg-[var(--bg-topbar)] px-4 py-4 backdrop-blur-xl md:px-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Operations Shell</p>
                  <h1 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Dashboard Workspace</h1>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                    已登录: {user.name ?? user.email}
                  </div>
                  <form action="/api/auth/logout" method="POST" className="hidden lg:block">
                    <Button type="submit" variant="ghost" size="sm">
                      退出登录
                    </Button>
                  </form>
                </div>
              </div>
            </header>

            <main className="min-w-0 px-4 py-4 md:px-6 md:py-6">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
