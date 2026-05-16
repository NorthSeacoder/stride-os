import Link from 'next/link';
import {
  Badge,
  Empty,
  PageIntro,
  SectionHeader,
  SurfacePanel,
} from '@/components/ui';
import { getDashboardSummary } from '@/lib/services/review-service';
import { getKeyResultStatusLabel, getReviewStatusLabel } from '@/lib/presentation/labels';
import {
  DashboardReviewClosureChart,
  DashboardTaskStatusChart,
  DashboardTodayLoadChart,
} from './dashboard-charts';

export default async function DashboardPage() {
  const summary = await getDashboardSummary();
  const totalTodayLoad = summary.todayTaskCounts.mustCount + summary.todayTaskCounts.focusCount;
  const statusChartData = [
    { key: 'inbox', label: '收件箱', value: summary.chartStats.taskDashboardCounts.inboxCount },
    { key: 'overdue', label: '已过期', value: summary.chartStats.taskDashboardCounts.overdueCount },
    { key: 'today', label: '今天', value: summary.chartStats.taskDashboardCounts.dueTodayCount },
    { key: 'done', label: '已完成', value: summary.chartStats.taskDashboardCounts.completedCount },
  ] as const;
  const todayLoadData = [
    { key: 'today', label: '今天到期', value: summary.todayTaskCounts.mustCount },
    { key: 'completed', label: '今日完成', value: summary.todayTaskCounts.focusCount },
  ] as const;
  const reviewSummaryData = [
    {
      key: 'risk',
      label: '风险 KR',
      value: summary.riskKeyResults.length,
      detail: summary.riskKeyResults.length > 0 ? '状态异常、缺少 check-in 或任务停滞' : '当前没有明显风险',
    },
    {
      key: 'closure',
      label: '复盘闭环',
      value: summary.latestReview ? 1 : 0,
      detail: summary.latestReview?.title ?? '尚未生成最新复盘',
    },
  ] as const;

  return (
    <div className="space-y-3">
      <PageIntro
        eyebrow="系统总览"
        title="工作台"
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/tasks"
              className="rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] px-3 py-2 text-sm text-(--text-secondary) transition-colors hover:border-(--border-glow) hover:text-(--text-primary)"
            >
              打开任务
            </Link>
            <Link
              href="/review"
              className="rounded-[var(--radius-compact)] border border-(--border-glow) bg-[color:rgba(180,204,255,0.08)] px-3 py-2 text-sm text-(--accent-ice-strong) transition-colors hover:bg-[color:rgba(180,204,255,0.12)]"
            >
              打开复盘
            </Link>
          </div>
        }
      />

      <SurfacePanel emphasis="strong" className="overflow-hidden">
        <div className="grid gap-px bg-(--border-hairline) xl:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <StatusTile
            featured
            eyebrow="当前周期"
            title={summary.currentPeriodSummary?.period.name ?? '暂无周期'}
            description={
              summary.currentPeriodSummary
                ? `${summary.currentPeriodSummary.objectiveCount} 个目标 / ${summary.currentPeriodSummary.keyResultCount} 个 KR`
                : '请先在 OKR 中建立周期'
            }
            href="/okr"
          />
          <StatusTile
            eyebrow="今日执行"
            title={`${summary.todayTaskCounts.mustCount} 项今日到期`}
            description={`${summary.todayTaskCounts.focusCount} 项今日完成 / ${totalTodayLoad} 项总负载`}
            href="/tasks"
          />
          <StatusTile
            eyebrow="风险 KR"
            title={`${summary.riskKeyResults.length} 项`}
            description={summary.riskKeyResults.length > 0 ? '低信心、缺少 check-in 或任务停滞' : '当前没有明显风险'}
            href="/okr"
          />
          <StatusTile
            eyebrow="最近复盘"
            title={summary.latestReview?.status ? getReviewStatusLabel(summary.latestReview.status) : '暂无'}
            description={summary.latestReview?.title ?? '生成一份新的周复盘'}
            href="/review"
          />
        </div>
      </SurfacePanel>

      <div className="grid gap-3 xl:grid-cols-2">
        <SurfacePanel className="metal-frame instrument-surface p-3.5">
          <SectionHeader
            eyebrow="执行负载"
            title="今日快照"
            action={
              <Link href="/tasks" className="text-sm text-(--text-secondary) transition-colors hover:text-(--text-primary)">
                任务
              </Link>
            }
          />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <MetricChip label="今天到期" value={String(summary.todayTaskCounts.mustCount)} />
            <MetricChip label="今日完成" value={String(summary.todayTaskCounts.focusCount)} />
          </div>
          <DashboardTodayLoadChart data={todayLoadData} />
        </SurfacePanel>

        <DashboardTaskStatusChart data={statusChartData} />
      </div>

      <SurfacePanel className="metal-frame instrument-surface p-3.5">
        <SectionHeader
          eyebrow="战略焦点"
          title="风险关键结果"
          action={
            <Link href="/okr" className="text-sm text-(--text-secondary) transition-colors hover:text-(--text-primary)">
              OKR
            </Link>
          }
        />
        <div className="mt-3 space-y-2">
          {summary.riskKeyResults.length === 0 ? (
            <Empty text="当前没有风险 KR。" />
          ) : (
            summary.riskKeyResults.map((kr: {
              id: string;
              title: string;
              status: string;
              objective: { title: string; period: { name: string } };
              latestCheckIn: { hasCheckIn: boolean; updatedAt?: string | Date | null };
              taskProgress: { hasCommittedTasks: boolean; completedCommittedTaskCount: number; committedTaskCount: number };
            }) => (
              <Link
                key={kr.id}
                href={`/okr/${kr.id}`}
                className="metal-frame block rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-3 transition-colors hover:border-(--border-glow) hover:bg-[color:rgba(255,255,255,0.05)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-(--text-muted)">{kr.objective.period.name}</p>
                  <Badge>{getKeyResultStatusLabel(kr.status)}</Badge>
                </div>
                <p className="mt-2 text-sm font-medium text-(--text-primary)">{kr.title}</p>
                <p className="mt-1 text-sm text-(--text-secondary)">{kr.objective.title}</p>
                <p className="mt-2 text-xs text-(--text-muted)">
                  {kr.taskProgress.hasCommittedTasks
                    ? `任务 ${kr.taskProgress.completedCommittedTaskCount}/${kr.taskProgress.committedTaskCount}`
                    : '暂无承诺任务'}
                </p>
                <p className="mt-1 text-xs text-(--text-muted)">
                  {kr.latestCheckIn.hasCheckIn
                    ? `最近 check-in: ${String((kr.latestCheckIn as { updatedAt?: string | Date | null }).updatedAt ?? '').slice(0, 10)}`
                    : '暂无 check-in'}
                </p>
              </Link>
            ))
          )}
        </div>
      </SurfacePanel>

      <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
        <SurfacePanel className="metal-frame instrument-surface p-3.5">
          <SectionHeader
            eyebrow="闭环摘要"
            title="最近复盘"
            action={
              <Link href="/review" className="text-sm text-(--text-secondary) transition-colors hover:text-(--text-primary)">
                复盘
              </Link>
            }
          />
          <div className="mt-3">
            {summary.latestReview ? (
              <div className="metal-frame rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-(--text-primary)">{summary.latestReview.title}</p>
                  <Badge>{getReviewStatusLabel(summary.latestReview.status)}</Badge>
                </div>
                <p className="mt-2 text-sm text-(--text-secondary)">
                  {summary.latestReview.periodStart} 至 {summary.latestReview.periodEnd}
                </p>
              </div>
            ) : (
              <Empty text="还没有保存任何复盘。" />
            )}
          </div>
        </SurfacePanel>

        <SurfacePanel className="metal-frame instrument-surface p-3.5">
          <SectionHeader
            eyebrow="闭环信号"
            title="风险与复盘"
            action={
              <Link href="/review" className="text-sm text-(--text-secondary) transition-colors hover:text-(--text-primary)">
                复盘
              </Link>
            }
          />
          <DashboardReviewClosureChart data={reviewSummaryData} />
        </SurfacePanel>
      </div>
    </div>
  );
}

function StatusTile({
  featured = false,
  eyebrow,
  title,
  description,
  href,
}: {
  featured?: boolean;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`metal-frame instrument-surface rounded-[var(--radius-compact)] px-3.5 py-3 transition-colors hover:bg-[color:rgba(22,26,33,0.88)] ${
        featured
          ? 'bg-[color:rgba(18,22,29,0.9)]'
          : 'bg-[color:rgba(14,17,22,0.7)]'
      }`}
    >
      <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">{eyebrow}</p>
      <p className={`mt-2.5 font-semibold tracking-[-0.03em] text-(--text-primary) ${featured ? 'text-2xl' : 'text-xl'}`}>
        {title}
      </p>
      <p className={`mt-1.5 text-(--text-secondary) ${featured ? 'max-w-[18rem] text-xs leading-5' : 'text-xs leading-5'}`}>{description}</p>
    </Link>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.04)] p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-(--text-muted)">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-(--text-primary)">{value}</p>
    </div>
  );
}
