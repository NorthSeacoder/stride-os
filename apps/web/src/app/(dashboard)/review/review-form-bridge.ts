export type DraftView = {
  type: 'weekly';
  periodStart: string;
  periodEnd: string;
  title: string;
  body: string;
  structuredSummary: Record<string, unknown>;
  keyResultIds: string[];
};

export type ReviewWindowValues = {
  periodStart: string;
  periodEnd: string;
};

export type ReviewDraftFormValues = {
  periodStart: string;
  periodEnd: string;
  title: string;
  body: string;
  structuredSummary: string;
  keyResultIds: string;
};

export function buildReviewWindowFormData(values: ReviewWindowValues) {
  const formData = new FormData();
  formData.set('periodStart', values.periodStart);
  formData.set('periodEnd', values.periodEnd);
  return formData;
}

export function buildReviewDraftFormValues(draft: DraftView): ReviewDraftFormValues {
  return {
    periodStart: draft.periodStart,
    periodEnd: draft.periodEnd,
    title: draft.title,
    body: draft.body,
    structuredSummary: JSON.stringify(draft.structuredSummary),
    keyResultIds: draft.keyResultIds.join(','),
  };
}

export function buildReviewDraftFormData(values: ReviewDraftFormValues) {
  const formData = new FormData();
  formData.set('periodStart', values.periodStart);
  formData.set('periodEnd', values.periodEnd);
  formData.set('title', values.title);
  formData.set('body', values.body);
  formData.set('structuredSummary', values.structuredSummary);
  formData.set('keyResultIds', values.keyResultIds);
  return formData;
}
