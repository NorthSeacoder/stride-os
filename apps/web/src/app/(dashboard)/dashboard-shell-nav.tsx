'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: '工作台', code: '01' },
  { href: '/okr', label: 'OKR', code: '02' },
  { href: '/tasks', label: '任务', code: '03' },
  { href: '/quadrants', label: '四象限', code: '04' },
  { href: '/review', label: '复盘', code: '05' },
  { href: '/settings', label: '设置', code: '06' },
];

export function DashboardShellNav() {
  const pathname = usePathname();

  return (
    <div className="space-y-2">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between rounded-[14px] border px-3 py-3 transition-[background-color,border-color,color] ${
              active
                ? 'border-[var(--border-glow)] bg-[color:rgba(180,204,255,0.08)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-hairline)] hover:bg-[color:rgba(255,255,255,0.04)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="text-sm font-medium">{item.label}</span>
            <span className={`text-[11px] uppercase tracking-[0.18em] ${active ? 'text-[var(--accent-ice)]' : 'text-[var(--text-muted)]'}`}>
              {item.code}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
