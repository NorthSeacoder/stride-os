import { getSessionUser } from '@/lib/auth/session';
import { PageIntro, SectionHeader, SurfacePanel } from '@/components/ui';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SettingsNav } from './settings-nav';

export default async function SettingsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="space-y-3">
      <PageIntro
        eyebrow="系统控制"
        title="设置"
      />

      <div className="grid gap-3 xl:grid-cols-[240px_minmax(0,1fr)]">
        <SurfacePanel className="metal-frame instrument-surface p-3.5">
          <SectionHeader
            eyebrow="Control Index"
            title="设置分组"
          />
          <SettingsNav />
        </SurfacePanel>

        <div className="space-y-3">
          <SurfacePanel className="metal-frame instrument-surface p-3.5">
            <SectionHeader
              eyebrow="Account"
              title="账户"
            />
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <InspectorMetric label="邮箱" value={user?.email ?? '未设置'} />
              <InspectorMetric label="姓名" value={user?.name ?? '未设置'} />
            </div>
          </SurfacePanel>

          <SurfacePanel className="metal-frame instrument-surface p-3.5">
            <SectionHeader
              eyebrow="Access"
              title="API 令牌"
            />
            <div className="mt-3">
              <Link
                href="/settings/tokens"
                className="inline-flex rounded-[var(--radius-compact)] border border-(--border-glow) bg-[color:rgba(180,204,255,0.08)] px-3 py-2 text-sm text-(--accent-ice-strong) transition-colors hover:bg-[color:rgba(180,204,255,0.12)]"
              >
                管理 API 令牌
              </Link>
            </div>
          </SurfacePanel>

          <SurfacePanel className="metal-frame instrument-surface p-3.5">
            <SectionHeader
              eyebrow="Preferences"
              title="偏好"
            />
            <div className="mt-3 rounded-[var(--radius-compact)] border border-dashed border-(--border-hairline) bg-[color:rgba(255,255,255,0.02)] p-3 text-sm text-(--text-secondary)">
              暂未开放
            </div>
          </SurfacePanel>
        </div>
      </div>
    </div>
  );
}

function InspectorMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metal-frame rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">{label}</p>
      <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-(--text-primary)">{value}</p>
    </div>
  );
}
