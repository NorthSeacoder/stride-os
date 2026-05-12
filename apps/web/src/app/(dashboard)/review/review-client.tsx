'use client';

import { useForm } from '@tanstack/react-form';
import { ActionStatus, Button, DatePickerField, ErrorAlert, PageIntro, SectionHeader, SurfacePanel, TextareaField, TextField } from '@/components/ui';
import { startTransition, useActionState, useEffect, useState } from 'react';
import { getReviewStatusLabel } from '@/lib/presentation/labels';
import {
  finalizeReviewAction,
  generateWeeklyDraftAction,
  saveReviewDraftAction,
  type ReviewActionState,
} from './actions';
import {
  buildReviewDraftFormData,
  buildReviewDraftFormValues,
  buildReviewWindowFormData,
  type DraftView,
} from './review-form-bridge';

type ReviewSummary = {
  id: string;
  title: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  updatedAt: Date | string;
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
  const reviewWindowForm = useForm({
    defaultValues: {
      periodStart: draft.periodStart,
      periodEnd: draft.periodEnd,
    },
    onSubmit: async ({ value }) => {
      startTransition(() => {
        generateAction(buildReviewWindowFormData(value));
      });
    },
  });
  const reviewDraftForm = useForm({
    defaultValues: buildReviewDraftFormValues(draft),
    onSubmit: async ({ value }) => {
      startTransition(() => {
        saveAction(buildReviewDraftFormData(value));
      });
    },
  });

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

  useEffect(() => {
    reviewWindowForm.reset({
      periodStart: draft.periodStart,
      periodEnd: draft.periodEnd,
    });
    reviewDraftForm.reset(buildReviewDraftFormValues(draft));
  }, [draft, reviewDraftForm, reviewWindowForm]);

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
            <form
              className="mt-5"
              onSubmit={(event) => {
                event.preventDefault();
                void reviewWindowForm.handleSubmit();
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <reviewWindowForm.Field name="periodStart">
                  {(field) => (
                    <DatePickerField
                      name={field.name}
                      label="开始日期"
                      value={field.state.value}
                      allowClear={false}
                      onValueChange={field.handleChange}
                    />
                  )}
                </reviewWindowForm.Field>
                <reviewWindowForm.Field name="periodEnd">
                  {(field) => (
                    <DatePickerField
                      name={field.name}
                      label="结束日期"
                      value={field.state.value}
                      allowClear={false}
                      onValueChange={field.handleChange}
                    />
                  )}
                </reviewWindowForm.Field>
              </div>
              {generateState.error && <div className="mt-4"><ErrorAlert message={generateState.error} /></div>}
              <reviewWindowForm.Subscribe selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}>
                {(state) => (
                  <div className="mt-4 flex items-center gap-3">
                    <ActionStatus pending={state.isSubmitting} idleLabel="等待生成" pendingLabel="生成中" />
                    <Button type="submit" variant="primary" disabled={!state.canSubmit || state.isSubmitting}>
                      生成草稿
                    </Button>
                  </div>
                )}
              </reviewWindowForm.Subscribe>
            </form>
          </SurfacePanel>

          <SurfacePanel className="metal-frame instrument-surface p-5 md:p-6">
            <SectionHeader
              eyebrow="Draft Editor"
              title="草稿正文"
              description="整理标题、正文和关键观察，再决定是否归档定稿。"
            />
            <div className="mt-5 space-y-4">
              <form
                id="review-save-form"
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void reviewDraftForm.handleSubmit();
                }}
              >
                {saveState.error && <ErrorAlert message={saveState.error} />}
                <reviewDraftForm.Field
                  name="title"
                  validators={{
                    onChange: ({ value }) => (value.trim() ? undefined : '标题不能为空'),
                  }}
                >
                  {(field) => (
                    <TextField
                      name={field.name}
                      label="标题"
                      value={field.state.value}
                      error={field.state.meta.isTouched ? (field.state.meta.errors[0] as string | undefined) : undefined}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  )}
                </reviewDraftForm.Field>
                <reviewDraftForm.Field name="body">
                  {(field) => (
                    <TextareaField
                      name={field.name}
                      label="正文"
                      rows={16}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      className="font-mono"
                    />
                  )}
                </reviewDraftForm.Field>
              </form>
              <div className="flex flex-wrap gap-3">
                <reviewDraftForm.Subscribe selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}>
                  {(state) => (
                    <div className="flex items-center gap-3">
                      <ActionStatus pending={state.isSubmitting} idleLabel="可保存" pendingLabel="保存中" />
                      <Button form="review-save-form" type="submit" variant="primary" disabled={!state.canSubmit || state.isSubmitting}>
                        保存草稿
                      </Button>
                    </div>
                  )}
                </reviewDraftForm.Subscribe>
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
          <div className="mt-5 rounded-[16px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">状态提示</p>
            <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
              {savedReviewId
                ? '当前草稿已保存，可继续编辑，或在确认内容后直接归档定稿。'
                : '当前草稿尚未保存，建议先确认标题与正文，再执行保存。'}
            </p>
          </div>
          <div className="mt-5 space-y-3">
            {reviews.length === 0 ? (
              <p className="text-sm text-(--text-secondary)">还没有保存任何复盘。</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="metal-frame rounded-[16px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-(--text-primary)">{review.title}</p>
                    <span className="text-xs text-(--text-muted)">{getReviewStatusLabel(review.status)}</span>
                  </div>
                  <p className="mt-2 text-sm text-(--text-secondary)">{review.periodStart} 至 {review.periodEnd}</p>
                  <p className="mt-2 text-xs text-(--text-muted)">更新于 {String(review.updatedAt).slice(0, 10)}</p>
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
    <div className="metal-frame rounded-[16px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">{label}</p>
      <p className="mt-3 text-lg font-semibold tracking-[-0.02em] text-(--text-primary)">{value}</p>
    </div>
  );
}
