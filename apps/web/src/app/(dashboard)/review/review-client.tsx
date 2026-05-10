'use client';

import { Button, DatePickerField, ErrorAlert, TextareaField, TextField } from '@/components/ui';
import { useActionState, useEffect, useState } from 'react';
import { getReviewStatusLabel } from '@/lib/presentation/labels';
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
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">复盘闭环</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">复盘</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
          基于已完成任务、未关闭的必做事项和 KR check-in 自动生成周复盘。先保存草稿，确认无误后再归档定稿。
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <form action={generateAction} className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <DatePickerField name="periodStart" label="开始日期" defaultValue={draft.periodStart} allowClear={false} />
              <DatePickerField name="periodEnd" label="结束日期" defaultValue={draft.periodEnd} allowClear={false} />
            </div>
            {generateState.error && <div className="mt-4"><ErrorAlert message={generateState.error} /></div>}
            <Button type="submit" variant="primary" className="mt-4">
              生成草稿
            </Button>
          </form>

          <div className="space-y-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
            <form id="review-save-form" action={saveAction} className="space-y-4">
              <input type="hidden" name="periodStart" value={draft.periodStart} />
              <input type="hidden" name="periodEnd" value={draft.periodEnd} />
              <input type="hidden" name="keyResultIds" value={draft.keyResultIds.join(',')} />
              <input type="hidden" name="structuredSummary" value={JSON.stringify(draft.structuredSummary)} />
              {saveState.error && <ErrorAlert message={saveState.error} />}
              <TextField
                name="title"
                label="标题"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
              <TextareaField
                name="body"
                label="正文"
                rows={16}
                value={draft.body}
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                className="font-mono"
              />
            </form>
            <div className="flex flex-wrap gap-3">
              <Button form="review-save-form" type="submit" variant="primary">
                保存草稿
              </Button>
              {savedReviewId && (
                <form action={async () => finalizeReviewAction(savedReviewId)}>
                  <Button type="submit" variant="success">
                    归档定稿
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">历史记录</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">最近的周复盘草稿与已定稿记录。</p>
          </div>
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">还没有保存任何复盘。</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                  <p className="font-medium text-[var(--text-primary)]">{review.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{review.periodStart} 至 {review.periodEnd}</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">{getReviewStatusLabel(review.status)} / 更新于 {String(review.updatedAt).slice(0, 10)}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
