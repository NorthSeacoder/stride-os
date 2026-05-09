'use client';

import { useActionState, useEffect, useState } from 'react';
import { ErrorAlert } from '@/components/ui';
import {
  finalizeReviewAction,
  generateWeeklyDraftAction,
  saveReviewDraftAction,
  type ReviewActionState,
} from './actions';

type ReviewSummary = {
  id: string;
  title: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  updatedAt: Date | string;
};

type DraftView = {
  type: 'weekly';
  periodStart: string;
  periodEnd: string;
  title: string;
  body: string;
  structuredSummary: Record<string, unknown>;
  keyResultIds: string[];
};

const initialState: ReviewActionState = {
  error: '',
  draft: null,
};

export function ReviewClient({
  initialDraft,
  latestDraftId,
  reviews,
}: {
  initialDraft: DraftView;
  latestDraftId: string | null;
  reviews: ReviewSummary[];
}) {
  const [draft, setDraft] = useState<DraftView>(initialDraft);
  const [savedReviewId, setSavedReviewId] = useState<string | null>(latestDraftId);
  const [generateState, generateAction] = useActionState(generateWeeklyDraftAction, initialState);
  const [saveState, saveAction] = useActionState(saveReviewDraftAction, initialState);

  useEffect(() => {
    if (generateState.draft) {
      setDraft(generateState.draft);
      setSavedReviewId(null);
    }
  }, [generateState]);

  useEffect(() => {
    if (saveState.draft) {
      setDraft(saveState.draft);
      setSavedReviewId(saveState.savedReviewId ?? null);
    }
  }, [saveState]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Reflection loop</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">Review</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
          Generate a weekly draft from completed tasks, open Must work, and KR check-ins. Save draft first, then finalize when the review is ready to archive.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <form action={generateAction} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-[var(--text-secondary)]">Period Start</span>
                <input type="date" name="periodStart" defaultValue={draft.periodStart} className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-[var(--text-secondary)]">Period End</span>
                <input type="date" name="periodEnd" defaultValue={draft.periodEnd} className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]" />
              </label>
            </div>
            {generateState.error && <div className="mt-4"><ErrorAlert message={generateState.error} /></div>}
            <button type="submit" className="mt-4 rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]">
              Generate Draft
            </button>
          </form>

          <div className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
            <form id="review-save-form" action={saveAction} className="space-y-4">
            <input type="hidden" name="periodStart" value={draft.periodStart} />
            <input type="hidden" name="periodEnd" value={draft.periodEnd} />
            <input type="hidden" name="keyResultIds" value={draft.keyResultIds.join(',')} />
            <input type="hidden" name="structuredSummary" value={JSON.stringify(draft.structuredSummary)} />
            {saveState.error && <ErrorAlert message={saveState.error} />}
            <label className="block">
              <span className="mb-1 block text-sm text-[var(--text-secondary)]">Title</span>
              <input
                name="title"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-[var(--text-secondary)]">Body</span>
              <textarea
                name="body"
                rows={16}
                value={draft.body}
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]"
              />
            </label>
            </form>
            <div className="flex flex-wrap gap-3">
              <button form="review-save-form" type="submit" className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]">
                Save Draft
              </button>
              {savedReviewId && (
                <form action={async () => finalizeReviewAction(savedReviewId)}>
                  <button type="submit" className="rounded-md border border-[var(--success-border)] px-4 py-2 text-sm font-medium text-[var(--success-text)]">
                    Finalize
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">History</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Recent weekly drafts and finalized reviews.</p>
          </div>
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No reviews saved yet.</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                  <p className="font-medium text-[var(--text-primary)]">{review.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{review.periodStart} to {review.periodEnd}</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">{review.status} / updated {String(review.updatedAt).slice(0, 10)}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
