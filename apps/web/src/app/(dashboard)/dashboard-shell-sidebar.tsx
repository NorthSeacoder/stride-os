'use client';

import { Button } from '@/components/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'stride.dashboard.nav.collapsed';

const navItems = [
  { href: '/dashboard', label: '工作台', code: '01', icon: GridIcon },
  { href: '/okr', label: 'OKR', code: '02', icon: TargetIcon },
  { href: '/tasks', label: '任务', code: '03', icon: CheckSquareIcon },
  { href: '/quadrants', label: '四象限', code: '04', icon: QuadrantIcon },
  { href: '/review', label: '复盘', code: '05', icon: NotebookIcon },
  { href: '/activity', label: '活动', code: '06', icon: ActivityIcon },
  { href: '/settings', label: '设置', code: '07', icon: GearIcon },
] as const;

type DashboardShellSidebarProps = {
  user: {
    name: string | null;
    email: string;
  };
  version: string;
  children: React.ReactNode;
};

function formatVersionLabel(version: string) {
  const commit = process.env.NEXT_PUBLIC_GIT_SHA;
  const shortCommit = commit ? commit.slice(0, 7) : '';

  return shortCommit ? `${version} · ${shortCommit}` : version;
}

export function DashboardShellSidebar({ user, version, children }: DashboardShellSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const versionLabel = formatVersionLabel(version);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === 'true');
    } catch {
      // Ignore unavailable localStorage and fall back to default state.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore unavailable localStorage and keep the in-memory toggle.
      }
      return next;
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <aside
        className={`border-b app-shell-divider min-h-0 bg-(--bg-sidebar) backdrop-blur-xl transition-[width,padding] duration-200 lg:flex lg:h-full lg:flex-col lg:border-b-0 lg:border-r ${
          collapsed ? 'px-1.5 py-2 lg:w-13 lg:px-1 lg:py-2' : 'px-2 py-2.5 lg:w-48 lg:px-2 lg:py-3'
        }`}
      >
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2`}>
          {!collapsed && (
            <Link
              href="/dashboard"
              className="min-w-0 text-sm font-semibold tracking-[-0.02em] text-(--text-primary)"
            >
              Stride OS
            </Link>
          )}
          <div className={`flex items-center gap-2 ${collapsed ? 'lg:flex-col' : ''}`}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label={collapsed ? '展开导航' : '收起导航'}
              title={collapsed ? '展开导航' : '收起导航'}
              onClick={toggleCollapsed}
              className={collapsed ? 'w-10 px-0' : ''}
            >
              <SidebarToggleIcon collapsed={collapsed} />
            </Button>
            <form action="/api/auth/logout" method="POST" className="lg:hidden">
              <Button type="submit" variant="ghost" size="sm">
                退出登录
              </Button>
            </form>
          </div>
        </div>

        <nav className={`mt-3 ${collapsed ? 'space-y-1' : 'lg:flex-1'}`}>
          <div className="space-y-2">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex rounded-[8px] border transition-[background-color,border-color,color,width] ${
                    collapsed
                      ? 'mx-auto h-9 w-9 items-center justify-center px-0 py-0'
                      : 'items-center justify-between px-2.5 py-2.25'
                  } ${
                    active
                      ? 'border-(--border-glow) bg-[color:rgba(180,204,255,0.08)] text-(--text-primary)'
                      : 'border-transparent text-(--text-secondary) hover:border-(--border-hairline) hover:bg-[color:rgba(255,255,255,0.04)] hover:text-(--text-primary)'
                  }`}
                >
                  <span className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                    <Icon className={active ? 'text-(--accent-ice)' : 'text-(--text-muted)'} />
                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </span>
                  {!collapsed && (
                    <span className={`text-[11px] uppercase tracking-[0.18em] ${active ? 'text-(--accent-ice)' : 'text-(--text-muted)'}`}>
                      {item.code}
                    </span>
                  )}
                  {collapsed && <span className="sr-only">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className={`mt-auto space-y-2 pt-2 ${collapsed ? 'flex flex-col items-center' : ''}`}>
          <div
            className={`text-[11px] text-(--text-muted) ${collapsed ? 'max-w-10 truncate text-center' : 'px-2.5'}`}
            title={`版本 ${versionLabel}`}
          >
            {collapsed ? version : `版本 ${versionLabel}`}
          </div>
          <form action="/api/auth/logout" method="POST" className={collapsed ? '' : 'w-full'}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className={collapsed ? 'w-9 px-0' : 'w-full justify-center'}
              title={user.name ?? user.email}
            >
              {collapsed ? <LogoutIcon /> : '退出登录'}
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

function IconBase({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={`h-4 w-4 ${className}`}>
      {children}
    </svg>
  );
}

function GridIcon({ className = '' }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="3" y="3" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12" y="3" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="3" y="12" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12" y="12" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </IconBase>
  );
}

function TargetIcon({ className = '' }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="10" cy="10" r="6.2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
    </IconBase>
  );
}

function CheckSquareIcon({ className = '' }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="3" y="3" width="14" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.8 10.1 8.9 12.2 13.5 7.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function QuadrantIcon({ className = '' }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M10 3.4v13.2M3.4 10h13.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="3" y="3" width="14" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.4" />
    </IconBase>
  );
}

function NotebookIcon({ className = '' }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="4" y="3" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </IconBase>
  );
}

function ActivityIcon({ className = '' }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 13.5h2.4l1.5-5 2.4 7 2-4h3.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="3.5" width="14" height="13" rx="2.2" stroke="currentColor" strokeWidth="1.4" />
    </IconBase>
  );
}

function GearIcon({ className = '' }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path
        d="M10 4.2 11.1 3l1.8 1 .2 1.6a4.8 4.8 0 0 1 1 .6l1.5-.5 1 1.8-1.1 1.1c.1.4.1.8.1 1.2s0 .8-.1 1.2l1.1 1.1-1 1.8-1.5-.5a4.8 4.8 0 0 1-1 .6L12.9 17l-1.8 1L10 16.8c-.4 0-.8 0-1.2-.1L7.7 18l-1.8-1 .2-1.6a4.8 4.8 0 0 1-1-.6l-1.5.5-1-1.8 1.1-1.1A5.5 5.5 0 0 1 3.6 10c0-.4 0-.8.1-1.2L2.6 7.7l1-1.8 1.5.5c.3-.2.6-.4 1-.6L6.3 4l1.8-1L9.2 4c.4 0 .8 0 1.2.1Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.4" />
    </IconBase>
  );
}

function SidebarToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4 text-(--text-secondary)">
      <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d={collapsed ? 'M8 6v8M12.7 10 10.4 7.7M12.7 10l-2.3 2.3' : 'M12 6v8M7.3 10l2.3-2.3M7.3 10l2.3 2.3'} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4 text-(--text-secondary)">
      <path d="M8 4.5H6.5A1.5 1.5 0 0 0 5 6v8a1.5 1.5 0 0 0 1.5 1.5H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11 13.5 14.5 10 11 6.5M14.5 10H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
