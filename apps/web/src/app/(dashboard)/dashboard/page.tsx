import Link from 'next/link';
import { Empty } from '@/components/ui';
import { getDashboardSummary } from '@/lib/services/review-service';

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Overview</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
          Current period, today execution, risky key results, and latest reflection in one place.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <SummaryCard
          title="Current Period"
          value={summary.currentPeriodSummary?.period.name ?? 'None'}
          meta={summary.currentPeriodSummary
            ? `${summary.currentPeriodSummary.objectiveCount} objectives / ${summary.currentPeriodSummary.keyResultCount} KRs`
            : 'Create a period in OKR'}
          href="/okr"
        />
        <SummaryCard
          title="Today Must"
          value={String(summary.todayTaskCounts.mustCount)}
          meta={`${summary.todayTaskCounts.focusCount} focus tasks`}
          href="/tasks"
        />
        <SummaryCard
          title="Risk KRs"
          value={String(summary.riskKeyResults.length)}
          meta={summary.riskKeyResults.length > 0 ? 'Needs check-ins or confidence recovery' : 'No immediate KR risk'}
          href="/okr"
        />
        <SummaryCard
          title="Latest Review"
          value={summary.latestReview?.status ?? 'None'}
          meta={summary.latestReview?.title ?? 'Generate a weekly review'}
          href="/review"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Risk Key Results</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Low confidence, stale, or explicitly at-risk KRs.</p>
            </div>
            <Link href="/okr" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Open OKR</Link>
          </div>
          <div className="mt-4 space-y-3">
            {summary.riskKeyResults.length === 0 ? (
              <Empty text="No risky KRs right now." />
            ) : (
              summary.riskKeyResults.map((kr: { id: string; title: string; status: string; objective: { title: string; period: { name: string } }; checkIns: Array<{ confidence: string; createdAt: Date }> }) => (
                <Link key={kr.id} href={`/okr/${kr.id}`} className="block rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 hover:bg-[var(--bg-canvas)]">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{kr.objective.period.name}</p>
                  <p className="mt-2 font-medium text-[var(--text-primary)]">{kr.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{kr.objective.title}</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    {kr.status} / confidence {kr.checkIns[0]?.confidence ?? 'unupdated'}
                  </p>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Today Snapshot</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Quick read on execution load.</p>
              </div>
              <Link href="/tasks" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Open Tasks</Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MetricChip label="Must" value={String(summary.todayTaskCounts.mustCount)} />
              <MetricChip label="Focus" value={String(summary.todayTaskCounts.focusCount)} />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Latest Review</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Most recent saved draft or final review.</p>
              </div>
              <Link href="/review" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Open Review</Link>
            </div>
            <div className="mt-4">
              {summary.latestReview ? (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                  <p className="font-medium text-[var(--text-primary)]">{summary.latestReview.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {summary.latestReview.periodStart} to {summary.latestReview.periodEnd}
                  </p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">{summary.latestReview.status}</p>
                </div>
              ) : (
                <Empty text="No review saved yet." />
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
    <Link href={href} className="block rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5 hover:bg-[var(--bg-elevated)]">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{meta}</p>
    </Link>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
