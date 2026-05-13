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
        description="账户、令牌与偏好设置被收拢到统一控制台里，保持结构稳定、信息清晰。"
      />

      <div className="grid gap-3 xl:grid-cols-[240px_minmax(0,1fr)]">
        <SurfacePanel className="metal-frame instrument-surface p-3.5">
          <SectionHeader
            eyebrow="Control Index"
            title="设置分组"
            description="左侧只放稳定分组，右侧只展示当前分组对应的控制内容。"
          />
          <SettingsNav />
        </SurfacePanel>

        <div className="space-y-3">
          <SurfacePanel className="metal-frame instrument-surface p-3.5">
            <SectionHeader
              eyebrow="Account"
              title="账户"
              description="当前登录身份与基础资料。"
            />
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <InspectorMetric label="邮箱" value={user?.email ?? '未设置'} />
              <InspectorMetric label="姓名" value={user?.name ?? '未设置'} />
            </div>
            <div className="mt-3 rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-3">
              <p className="text-xs leading-5 text-(--text-secondary)">
                账户页只承载当前身份与基础资料。密钥操作与后续偏好将分别停留在各自分组里，避免控制台首页混入所有设置内容。
              </p>
            </div>
          </SurfacePanel>

          <SurfacePanel className="metal-frame instrument-surface p-3.5">
            <SectionHeader
              eyebrow="Access"
              title="API 令牌"
              description="令牌在独立分组页内管理，这里只保留入口和说明。"
            />
            <div className="mt-3 rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-3">
              <p className="text-xs leading-5 text-(--text-secondary)">
                令牌管理仍在独立页面中完成，这里保留稳定入口，避免把高风险操作堆进设置首页。
              </p>
              <div className="mt-3">
                <Link
                  href="/settings/tokens"
                  className="inline-flex rounded-[var(--radius-compact)] border border-(--border-glow) bg-[color:rgba(180,204,255,0.08)] px-3 py-2 text-sm text-(--accent-ice-strong) transition-colors hover:bg-[color:rgba(180,204,255,0.12)]"
                >
                  管理 API 令牌
                </Link>
              </div>
            </div>
          </SurfacePanel>

          <SurfacePanel className="metal-frame instrument-surface p-3.5">
            <SectionHeader
              eyebrow="Preferences"
              title="偏好"
              description="当前版本尚未开放，作为明确的后续分组占位。"
            />
            <div className="mt-3 rounded-[var(--radius-compact)] border border-dashed border-(--border-hairline) bg-[color:rgba(255,255,255,0.02)] p-3">
              <p className="text-xs leading-5 text-(--text-secondary)">
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
    <div className="metal-frame rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">{label}</p>
      <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-(--text-primary)">{value}</p>
    </div>
  );
}
