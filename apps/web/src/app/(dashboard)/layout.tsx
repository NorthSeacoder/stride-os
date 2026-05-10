import { Button } from '@/components/ui';
import { getSessionUser } from '@/lib/auth/session';
import Link from 'next/link';
import { redirect } from 'next/navigation';

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
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <nav className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-[var(--text-primary)]">Stride OS</Link>
          <Link href="/dashboard" className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">工作台</Link>
          <Link href="/tasks" className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">任务</Link>
          <Link href="/quadrants" className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">四象限</Link>
          <Link href="/okr" className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">OKR</Link>
          <Link href="/review" className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">复盘</Link>
          <Link href="/settings" className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">设置</Link>
        </div>
        <div className="flex items-center gap-4">
          <p className="hidden text-sm text-[var(--text-secondary)] sm:block">
            {user.name ?? user.email}
          </p>
          <form action="/api/auth/logout" method="POST">
            <Button type="submit" variant="ghost" size="sm" className="px-1">
              退出登录
            </Button>
          </form>
        </div>
      </nav>
      <main className="px-6 py-6">{children}</main>
    </div>
  );
}
