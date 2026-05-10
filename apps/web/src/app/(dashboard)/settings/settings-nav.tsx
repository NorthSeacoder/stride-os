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
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="mt-5 space-y-3">
      {items.map((item) => {
        const active = item.match(pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`metal-frame block rounded-[16px] border p-4 transition-colors ${
              active
                ? 'border-[var(--border-glow)] bg-[color:rgba(180,204,255,0.08)]'
                : 'border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] hover:border-[var(--border-glow)] hover:bg-[color:rgba(255,255,255,0.05)]'
            }`}
          >
            <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.detail}</p>
          </Link>
        );
      })}

      <div className="metal-frame rounded-[16px] border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] p-4">
        <p className="text-sm font-medium text-[var(--text-primary)]">偏好</p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">后续扩展区</p>
      </div>
    </div>
  );
}
