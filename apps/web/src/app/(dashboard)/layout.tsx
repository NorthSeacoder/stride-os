import { getSessionUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { DashboardShellSidebar } from './dashboard-shell-sidebar';

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
    <div className="h-dvh overflow-hidden bg-(--bg-shell) p-0 text-(--text-primary)">
      <div className="app-shell-grid app-shell-panel h-full overflow-hidden rounded-[var(--radius-shell)]">
        <DashboardShellSidebar user={{ name: user.name ?? null, email: user.email }}>
          <main className="dashboard-main-scroll min-h-0 min-w-0 flex-1 overflow-y-auto px-1.5 py-1.5 md:px-2 md:py-2 lg:px-2.5 lg:py-2.5">
            {children}
          </main>
        </DashboardShellSidebar>
      </div>
    </div>
  );
}
