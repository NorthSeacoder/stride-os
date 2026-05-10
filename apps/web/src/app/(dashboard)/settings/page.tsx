import { getSessionUser } from '@/lib/auth/session';
import { PageIntro, SectionHeader, SurfacePanel } from '@/components/ui';
import Link from 'next/link';
import { SettingsNav } from './settings-nav';

export default async function SettingsPage() {
  const user = await getSessionUser();

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="系统控制"
        title="设置"
        description="账户、令牌与偏好设置被收拢到统一控制台里，保持结构稳定、信息清晰。"
      />

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <SurfacePanel className="metal-frame instrument-surface p-5 md:p-6">
          <SectionHeader
            eyebrow="Control Index"
            title="设置分组"
            description="左侧只放稳定分组，右侧展开具体控制项。"
          />
          <SettingsNav />
        </SurfacePanel>

        <div className="space-y-6">
          <SurfacePanel className="metal-frame instrument-surface p-5 md:p-6">
            <SectionHeader
              eyebrow="Account"
              title="账户"
              description="当前登录身份与基础资料。"
            />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <InspectorMetric label="邮箱" value={user?.email ?? '未设置'} />
              <InspectorMetric label="姓名" value={user?.name ?? '未设置'} />
            </div>
          </SurfacePanel>

          <SurfacePanel className="metal-frame instrument-surface p-5 md:p-6">
            <SectionHeader
              eyebrow="Access"
              title="API 令牌"
              description="管理用于集成和自动化访问的 API 令牌。"
            />
            <div className="mt-5 rounded-[16px] border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] p-4">
              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                令牌管理仍在独立页面中完成，这里保留稳定入口，避免把高风险操作堆进设置首页。
              </p>
              <div className="mt-4">
                <Link
                  href="/settings/tokens"
                  className="inline-flex rounded-[var(--radius-compact)] border border-[var(--border-glow)] bg-[color:rgba(180,204,255,0.08)] px-3 py-2 text-sm text-[var(--accent-ice-strong)] transition-colors hover:bg-[color:rgba(180,204,255,0.12)]"
                >
                  管理 API 令牌
                </Link>
              </div>
            </div>
          </SurfacePanel>

          <SurfacePanel className="metal-frame instrument-surface p-5 md:p-6">
            <SectionHeader
              eyebrow="Preferences"
              title="偏好"
              description="预留给后续系统行为、个人习惯和通知策略。"
            />
            <div className="mt-5 rounded-[16px] border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] p-4">
              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                当前版本暂未开放更多偏好项。后续若增加界面、通知或自动化设置，可继续沿用这一分组结构。
              </p>
            </div>
          </SurfacePanel>
        </div>
      </div>
    </div>
  );
}

function InspectorMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metal-frame rounded-[16px] border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-lg font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
