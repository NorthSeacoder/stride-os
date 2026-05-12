'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  {
    href: '/settings',
    label: '账户',
    detail: '身份与基础资料',
    match: (pathname: string) => pathname === '/settings',
  },
  {
    href: '/settings/tokens',
    label: 'API 令牌',
    detail: '访问密钥与集成认证',
    match: (pathname: string) => pathname.startsWith('/settings/tokens'),
  },
  {
    href: '/settings/preferences',
    label: '偏好',
    detail: '界面、通知与自动化策略',
    disabled: true,
    match: (pathname: string) => pathname.startsWith('/settings/preferences'),
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="mt-5 space-y-3">
      {items.map((item) => {
        const active = item.match(pathname);

        if (item.disabled) {
          return (
            <div
              key={item.href}
              aria-disabled="true"
              className="metal-frame rounded-[16px] border border-dashed border-(--border-hairline) bg-[color:rgba(255,255,255,0.02)] p-4 opacity-80"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-(--text-primary)">{item.label}</p>
                <span className="rounded-full border border-(--border-hairline) px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-(--text-muted)">
                  未开放
                </span>
              </div>
              <p className="mt-2 text-sm text-(--text-secondary)">{item.detail}</p>
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`metal-frame block rounded-[16px] border p-4 transition-colors ${
              active
                ? 'border-(--border-glow) bg-[color:rgba(180,204,255,0.08)]'
                : 'border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] hover:border-(--border-glow) hover:bg-[color:rgba(255,255,255,0.05)]'
            }`}
          >
            <p className="text-sm font-medium text-(--text-primary)">{item.label}</p>
            <p className="mt-2 text-sm text-(--text-secondary)">{item.detail}</p>
          </Link>
        );
      })}
    </div>
  );
}
