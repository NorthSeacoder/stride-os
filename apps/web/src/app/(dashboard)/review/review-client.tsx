'use client';

import { Button, DatePickerField, ErrorAlert, PageIntro, SectionHeader, SurfacePanel, TextareaField, TextField } from '@/components/ui';
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
      <PageIntro
        eyebrow="复盘闭环"
        title="复盘"
        description="基于已完成任务、未关闭的必做事项和 KR check-in 自动生成周复盘。先保存草稿，确认无误后再归档定稿。"
      />

      <div className="grid gap-3 xl:grid-cols-3">
        <InspectorMetric label="当前区间" value={`${draft.periodStart} 至 ${draft.periodEnd}`} />
        <InspectorMetric label="当前状态" value={savedReviewId ? '已保存草稿' : '待保存'} />
        <InspectorMetric label="历史记录" value={`${reviews.length} 份`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <SurfacePanel className="metal-frame instrument-surface p-5 md:p-6">
            <SectionHeader
              eyebrow="Review Window"
              title="生成区间"
              description="先确定复盘周期，再生成新的周复盘草稿。"
            />
            <form action={generateAction} className="mt-5">
              <div className="grid gap-4 md:grid-cols-2">
                <DatePickerField name="periodStart" label="开始日期" defaultValue={draft.periodStart} allowClear={false} />
                <DatePickerField name="periodEnd" label="结束日期" defaultValue={draft.periodEnd} allowClear={false} />
              </div>
              {generateState.error && <div className="mt-4"><ErrorAlert message={generateState.error} /></div>}
              <Button type="submit" variant="primary" className="mt-4">
                生成草稿
              </Button>
            </form>
          </SurfacePanel>

          <SurfacePanel className="metal-frame instrument-surface p-5 md:p-6">
            <SectionHeader
              eyebrow="Draft Editor"
              title="草稿正文"
              description="整理标题、正文和关键观察，再决定是否归档定稿。"
            />
            <div className="mt-5 space-y-4">
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
          </SurfacePanel>
        </div>

        <SurfacePanel className="metal-frame instrument-surface p-5 md:p-6">
          <SectionHeader
            eyebrow="Archive"
            title="历史记录"
            description="最近的周复盘草稿与已定稿记录。"
          />
          <div className="mt-5 rounded-[16px] border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">状态提示</p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {savedReviewId
                ? '当前草稿已保存，可继续编辑，或在确认内容后直接归档定稿。'
                : '当前草稿尚未保存，建议先确认标题与正文，再执行保存。'}
            </p>
          </div>
          <div className="mt-5 space-y-3">
            {reviews.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">还没有保存任何复盘。</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="metal-frame rounded-[16px] border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-[var(--text-primary)]">{review.title}</p>
                    <span className="text-xs text-[var(--text-muted)]">{getReviewStatusLabel(review.status)}</span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{review.periodStart} 至 {review.periodEnd}</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">更新于 {String(review.updatedAt).slice(0, 10)}</p>
                </div>
              ))
            )}
          </div>
        </SurfacePanel>
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
