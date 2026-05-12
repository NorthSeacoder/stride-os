import { describe, expect, it } from 'vitest';
import {
  buildReviewDraftFormData,
  buildReviewDraftFormValues,
  buildReviewWindowFormData,
} from '@/app/(dashboard)/review/review-form-bridge';

describe('review form bridge', () => {
  it('serializes generation window into FormData', () => {
    const formData = buildReviewWindowFormData({
      periodStart: '2026-05-05',
      periodEnd: '2026-05-11',
    });

    expect(formData.get('periodStart')).toBe('2026-05-05');
    expect(formData.get('periodEnd')).toBe('2026-05-11');
  });

  it('maps draft payload into editable form values and back into FormData', () => {
    const values = buildReviewDraftFormValues({
      type: 'weekly',
      periodStart: '2026-05-05',
      periodEnd: '2026-05-11',
      title: 'Weekly review',
      body: 'Body',
      structuredSummary: { completedTaskCount: 2 },
      keyResultIds: ['kr_1', 'kr_2'],
    });

    expect(values).toEqual({
      periodStart: '2026-05-05',
      periodEnd: '2026-05-11',
      title: 'Weekly review',
      body: 'Body',
      structuredSummary: JSON.stringify({ completedTaskCount: 2 }),
      keyResultIds: 'kr_1,kr_2',
    });

    const formData = buildReviewDraftFormData(values);
    expect(formData.get('periodStart')).toBe('2026-05-05');
    expect(formData.get('periodEnd')).toBe('2026-05-11');
    expect(formData.get('title')).toBe('Weekly review');
    expect(formData.get('body')).toBe('Body');
    expect(formData.get('structuredSummary')).toBe(JSON.stringify({ completedTaskCount: 2 }));
    expect(formData.get('keyResultIds')).toBe('kr_1,kr_2');
  });
});
