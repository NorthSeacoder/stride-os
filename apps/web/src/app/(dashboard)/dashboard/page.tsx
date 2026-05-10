import Link from 'next/link';
import { Empty } from '@/components/ui';
import { getDashboardSummary } from '@/lib/services/review-service';
import { getConfidenceLabel, getKeyResultStatusLabel, getReviewStatusLabel } from '@/lib/presentation/labels';

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">总览</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">工作台</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
          当前周期、今日执行情况、风险 KR 与最近一次复盘，集中展示在这里。
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <SummaryCard
          title="当前周期"
          value={summary.currentPeriodSummary?.period.name ?? '暂无'}
          meta={summary.currentPeriodSummary
            ? `${summary.currentPeriodSummary.objectiveCount} 个目标 / ${summary.currentPeriodSummary.keyResultCount} 个 KR`
            : '请先在 OKR 中创建周期'}
          href="/okr"
        />
        <SummaryCard
          title="今日必做"
          value={String(summary.todayTaskCounts.mustCount)}
          meta={`${summary.todayTaskCounts.focusCount} 个专注任务`}
          href="/tasks"
        />
        <SummaryCard
          title="风险 KR"
          value={String(summary.riskKeyResults.length)}
          meta={summary.riskKeyResults.length > 0 ? '需要补充 check-in 或恢复信心' : '当前没有明显风险'}
          href="/okr"
        />
        <SummaryCard
          title="最近复盘"
          value={summary.latestReview?.status ? getReviewStatusLabel(summary.latestReview.status) : '暂无'}
          meta={summary.latestReview?.title ?? '生成一份周复盘'}
          href="/review"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">风险关键结果</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">低信心、长期未更新，或明确标记为有风险的 KR。</p>
            </div>
            <Link href="/okr" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">打开 OKR</Link>
          </div>
          <div className="mt-4 space-y-3">
            {summary.riskKeyResults.length === 0 ? (
              <Empty text="当前没有风险 KR。" />
            ) : (
              summary.riskKeyResults.map((kr: { id: string; title: string; status: string; objective: { title: string; period: { name: string } }; checkIns: Array<{ confidence: string; createdAt: Date }> }) => (
                <Link key={kr.id} href={`/okr/${kr.id}`} className="block rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 hover:bg-[var(--bg-canvas)]">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{kr.objective.period.name}</p>
                  <p className="mt-2 font-medium text-[var(--text-primary)]">{kr.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{kr.objective.title}</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    {getKeyResultStatusLabel(kr.status)} / 信心 {getConfidenceLabel(kr.checkIns[0]?.confidence)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">今日快照</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">快速查看今天的执行负载。</p>
              </div>
              <Link href="/tasks" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">打开任务</Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MetricChip label="必做" value={String(summary.todayTaskCounts.mustCount)} />
              <MetricChip label="专注" value={String(summary.todayTaskCounts.focusCount)} />
            </div>
            <TodayLoadBar mustCount={summary.todayTaskCounts.mustCount} focusCount={summary.todayTaskCounts.focusCount} />
          </div>

          <TaskStatusChart counts={summary.chartStats.taskStatusCounts} />

          <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">最近复盘</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">最近保存的草稿或已归档复盘。</p>
              </div>
              <Link href="/review" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">打开复盘</Link>
            </div>
            <div className="mt-4">
              {summary.latestReview ? (
                <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                  <p className="font-medium text-[var(--text-primary)]">{summary.latestReview.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {summary.latestReview.periodStart} 至 {summary.latestReview.periodEnd}
                  </p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">{getReviewStatusLabel(summary.latestReview.status)}</p>
                </div>
              ) : (
                <Empty text="还没有保存任何复盘。" />
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  meta,
  href,
}: {
  title: string;
  value: string;
  meta: string;
  href: string;
}) {
  return (
    <Link href={href} className="block rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5 hover:bg-[var(--bg-elevated)]">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{meta}</p>
    </Link>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function TodayLoadBar({ mustCount, focusCount }: { mustCount: number; focusCount: number }) {
  const total = mustCount + focusCount;
  const mustPercent = total > 0 ? (mustCount / total) * 100 : 0;
  const focusPercent = total > 0 ? (focusCount / total) * 100 : 0;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>今日负载</span>
        <span>{total} 项</span>
      </div>
      <div className="mt-2 flex h-3 overflow-hidden rounded bg-[var(--bg-canvas)]">
        {total === 0 ? (
          <div className="h-full w-full bg-[var(--bg-elevated)]" />
        ) : (
          <>
            <div className="h-full bg-[var(--warning-border)]" style={{ width: `${mustPercent}%` }} />
            <div className="h-full bg-[var(--success-border)]" style={{ width: `${focusPercent}%` }} />
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
    <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">任务分布</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">按当前流程状态查看任务池。</p>
        </div>
        <Link href="/tasks" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">打开任务</Link>
      </div>
      <div className="mt-4 space-y-3">
        {rows.map((row) => {
          const value = counts[row.key];
          const width = value > 0 ? Math.max((value / max) * 100, 8) : 0;

          return (
            <div key={row.key}>
              <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>{row.label}</span>
                <span>{value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-[var(--bg-canvas)]">
                <div className="h-full bg-[var(--border-strong)]" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
