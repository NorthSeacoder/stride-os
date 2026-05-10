import Link from 'next/link';
import {
  Badge,
  Empty,
  PageIntro,
  SectionHeader,
  SurfacePanel,
} from '@/components/ui';
import { getDashboardSummary } from '@/lib/services/review-service';
import { getConfidenceLabel, getKeyResultStatusLabel, getReviewStatusLabel } from '@/lib/presentation/labels';

export default async function DashboardPage() {
  const summary = await getDashboardSummary();
  const totalTodayLoad = summary.todayTaskCounts.mustCount + summary.todayTaskCounts.focusCount;

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="系统总览"
        title="工作台"
        description="当前周期、今日执行负载、风险 KR 与最近复盘，被重组到一张更清晰的操作台上。"
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/tasks"
              className="rounded-[var(--radius-compact)] border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-glow)] hover:text-[var(--text-primary)]"
            >
              打开任务
            </Link>
            <Link
              href="/review"
              className="rounded-[var(--radius-compact)] border border-[var(--border-glow)] bg-[color:rgba(180,204,255,0.08)] px-3 py-2 text-sm text-[var(--accent-ice-strong)] transition-colors hover:bg-[color:rgba(180,204,255,0.12)]"
            >
              打开复盘
            </Link>
          </div>
        }
      />

      <SurfacePanel emphasis="strong" className="overflow-hidden">
        <div className="grid gap-px bg-[var(--border-hairline)] xl:grid-cols-[1.35fr_1fr_1fr_1fr]">
          <StatusTile
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
            title={`${summary.todayTaskCounts.mustCount} 项必做`}
            description={`${summary.todayTaskCounts.focusCount} 项专注任务 / ${totalTodayLoad} 项总负载`}
            href="/tasks"
          />
          <StatusTile
            eyebrow="风险 KR"
            title={`${summary.riskKeyResults.length} 项`}
            description={summary.riskKeyResults.length > 0 ? '需要补充 check-in 或恢复信心' : '当前没有明显风险'}
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

      <div className="grid gap-3 xl:grid-cols-3">
        <SignalStrip
          label="系统载荷"
          value={`${totalTodayLoad} 项`}
          detail={totalTodayLoad > 0 ? '今日任务池已加载' : '今日任务池为空'}
        />
        <SignalStrip
          label="风险密度"
          value={`${summary.riskKeyResults.length} 项`}
          detail={summary.riskKeyResults.length > 0 ? '建议优先处理风险 KR' : '当前风险可控'}
        />
        <SignalStrip
          label="闭环状态"
          value={summary.latestReview?.status ? getReviewStatusLabel(summary.latestReview.status) : '待生成'}
          detail={summary.latestReview?.title ?? '尚未生成最新复盘'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <SurfacePanel className="metal-frame instrument-surface p-5 md:p-6">
          <SectionHeader
            eyebrow="战略焦点"
            title="风险关键结果"
            description="低信心、长期未更新，或明确标记为有风险的 KR。"
            action={
              <Link href="/okr" className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
                打开 OKR
              </Link>
            }
          />
          <div className="mt-5 space-y-3">
            {summary.riskKeyResults.length === 0 ? (
              <Empty text="当前没有风险 KR。" />
            ) : (
              summary.riskKeyResults.map((kr: { id: string; title: string; status: string; objective: { title: string; period: { name: string } }; checkIns: Array<{ confidence: string; createdAt: Date }> }) => (
                <Link
                  key={kr.id}
                  href={`/okr/${kr.id}`}
                  className="metal-frame block rounded-[16px] border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] p-4 transition-colors hover:border-[var(--border-glow)] hover:bg-[color:rgba(255,255,255,0.05)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{kr.objective.period.name}</p>
                    <Badge>{getKeyResultStatusLabel(kr.status)}</Badge>
                  </div>
                  <p className="mt-3 text-base font-medium text-[var(--text-primary)]">{kr.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{kr.objective.title}</p>
                  <p className="mt-3 text-xs text-[var(--text-muted)]">最新信心: {getConfidenceLabel(kr.checkIns[0]?.confidence)}</p>
                </Link>
              ))
            )}
          </div>
        </SurfacePanel>

        <div className="space-y-6">
          <SurfacePanel className="metal-frame instrument-surface p-5 md:p-6">
            <SectionHeader
              eyebrow="执行负载"
              title="今日快照"
              description="快速查看今天的执行负载和专注分配。"
              action={
                <Link href="/tasks" className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
                  打开任务
                </Link>
              }
            />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <MetricChip label="必做" value={String(summary.todayTaskCounts.mustCount)} />
              <MetricChip label="专注" value={String(summary.todayTaskCounts.focusCount)} />
            </div>
            <TodayLoadBar mustCount={summary.todayTaskCounts.mustCount} focusCount={summary.todayTaskCounts.focusCount} />
          </SurfacePanel>

          <TaskStatusChart counts={summary.chartStats.taskStatusCounts} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SurfacePanel className="metal-frame instrument-surface p-5 md:p-6">
          <SectionHeader
            eyebrow="闭环摘要"
            title="最近复盘"
            description="最近保存的草稿或已归档复盘。"
            action={
              <Link href="/review" className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
                打开复盘
              </Link>
            }
          />
          <div className="mt-5">
            {summary.latestReview ? (
              <div className="metal-frame rounded-[16px] border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-[var(--text-primary)]">{summary.latestReview.title}</p>
                  <Badge>{getReviewStatusLabel(summary.latestReview.status)}</Badge>
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {summary.latestReview.periodStart} 至 {summary.latestReview.periodEnd}
                </p>
              </div>
            ) : (
              <Empty text="还没有保存任何复盘。" />
            )}
          </div>
        </SurfacePanel>

        <SurfacePanel className="metal-frame instrument-surface p-5 md:p-6">
          <SectionHeader
            eyebrow="任务池"
            title="流程分布"
            description="按当前流程状态查看任务池，帮助判断系统是否失衡。"
            action={
              <Link href="/tasks" className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
                打开任务
              </Link>
            }
          />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <CompactSummary
              label="收件箱"
              value={summary.chartStats.taskStatusCounts.inbox}
              tone="neutral"
            />
            <CompactSummary
              label="今日"
              value={summary.chartStats.taskStatusCounts.today}
              tone="success"
            />
            <CompactSummary
              label="已排期"
              value={summary.chartStats.taskStatusCounts.scheduled}
              tone="warning"
            />
            <CompactSummary
              label="已完成"
              value={summary.chartStats.taskStatusCounts.done}
              tone="neutral"
            />
          </div>
        </SurfacePanel>
      </div>
    </div>
  );
}

function StatusTile({
  eyebrow,
  title,
  description,
  href,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="metal-frame instrument-surface bg-[color:rgba(14,17,22,0.7)] px-5 py-5 transition-colors hover:bg-[color:rgba(22,26,33,0.88)]"
    >
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">{eyebrow}</p>
      <p className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{title}</p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p>
    </Link>
  );
}

function SignalStrip({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="metal-frame rounded-[16px] border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">{label}</p>
        <span className="h-2 w-2 rounded-full bg-[var(--accent-ice)] shadow-[0_0_14px_rgba(180,204,255,0.9)]" />
      </div>
      <p className="mt-3 text-lg font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{detail}</p>
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.04)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function CompactSummary({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'success' | 'warning';
}) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <Badge tone={tone}>{label}</Badge>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function TodayLoadBar({ mustCount, focusCount }: { mustCount: number; focusCount: number }) {
  const total = mustCount + focusCount;
  const mustPercent = total > 0 ? (mustCount / total) * 100 : 0;
  const focusPercent = total > 0 ? (focusCount / total) * 100 : 0;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>今日负载</span>
        <span>{total} 项</span>
      </div>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)]">
        {total === 0 ? (
          <div className="h-full w-full bg-[color:rgba(255,255,255,0.04)]" />
        ) : (
          <>
            <div className="h-full bg-[var(--warning-border)]" style={{ width: `${mustPercent}%` }} />
            <div className="h-full bg-[var(--accent-ice)]" style={{ width: `${focusPercent}%` }} />
          </>
        )}
      </div>
    </div>
  );
}

function TaskStatusChart({
  counts,
}: {
  counts: Record<'inbox' | 'today' | 'scheduled' | 'done' | 'canceled', number>;
}) {
  const rows = [
    { key: 'inbox', label: '收件箱' },
    { key: 'today', label: '今日' },
    { key: 'scheduled', label: '已排期' },
    { key: 'done', label: '已完成' },
  ] as const;
  const max = Math.max(...rows.map((row) => counts[row.key]), 1);

  return (
    <SurfacePanel className="p-5 md:p-6">
      <SectionHeader
        eyebrow="状态切片"
        title="任务分布"
        description="用最轻量的图形信号查看当前流程状态。"
        action={
          <Link href="/tasks" className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
            打开任务
          </Link>
        }
      />
      <div className="mt-5 space-y-4">
        {rows.map((row) => {
          const value = counts[row.key];
          const width = value > 0 ? Math.max((value / max) * 100, 8) : 0;

          return (
            <div key={row.key}>
              <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>{row.label}</span>
                <span>{value}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)]">
                <div className="h-full bg-[var(--accent-ice)]" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </SurfacePanel>
  );
}
