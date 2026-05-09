import Link from 'next/link';
import { Empty } from '@/components/ui';
import { getKeyResultDetail } from '@/lib/services/okr-service';
import { CheckInForm } from './check-in-form';

export default async function KeyResultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const keyResult = await getKeyResultDetail(id);

  if (!keyResult) {
    return (
      <div className="space-y-4">
        <Link href="/okr" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          Back to OKR
        </Link>
        <Empty text="Key result not found." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/okr" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        Back to OKR
      </Link>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {keyResult.objective.period.name} / {keyResult.objective.title}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{keyResult.title}</h1>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
          <span>Type: {keyResult.type}</span>
          <span>Status: {keyResult.status}</span>
          <span>Confidence: {keyResult.progress?.confidence ?? 'unupdated'}</span>
          <span>Progress: {keyResult.progress?.progressValue ?? 'n/a'}</span>
        </div>
      </div>

      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Linked Tasks</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Tasks attached from the task workflow appear here as execution material.</p>
        <div className="mt-4 space-y-3">
          {keyResult.tasks.length === 0 ? (
            <Empty text="No tasks linked to this KR yet." />
          ) : (
            keyResult.tasks.map((task: { id: string; title: string; status: string; todayType: string | null; notes: string | null }) => (
              <div key={task.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[var(--text-primary)]">{task.title}</p>
                  <span className="text-xs text-[var(--text-muted)]">{task.status}</span>
                  {task.todayType && <span className="text-xs text-[var(--text-muted)]">{task.todayType}</span>}
                </div>
                {task.notes && <p className="mt-2 text-sm text-[var(--text-secondary)]">{task.notes}</p>}
              </div>
            ))
          )}
        </div>
      </section>

      <CheckInForm keyResultId={keyResult.id} />

      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Check-in History</h2>
        <div className="mt-4 space-y-3">
          {keyResult.checkIns.length === 0 ? (
            <Empty text="No check-ins yet." />
          ) : (
            keyResult.checkIns.map((checkIn: { id: string; confidence: string; progressValue: number | null; summary: string | null; blockers: string | null; nextActions: string | null; createdAt: Date }) => (
              <div key={checkIn.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <div className="flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
                  <span>{String(checkIn.createdAt).slice(0, 10)}</span>
                  <span>Confidence {checkIn.confidence}</span>
                  <span>Progress {checkIn.progressValue ?? 'n/a'}</span>
                </div>
                {checkIn.summary && <p className="mt-2 text-sm text-[var(--text-primary)]">{checkIn.summary}</p>}
                {checkIn.blockers && <p className="mt-1 text-sm text-[var(--text-secondary)]">Blockers: {checkIn.blockers}</p>}
                {checkIn.nextActions && <p className="mt-1 text-sm text-[var(--text-secondary)]">Next: {checkIn.nextActions}</p>}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
