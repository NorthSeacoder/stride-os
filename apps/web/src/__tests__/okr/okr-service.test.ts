import { describe, expect, it } from 'vitest';

import { PERIOD_TYPES } from '@/lib/services/okr-service';
import { getPeriodTypeLabel } from '@/lib/presentation/labels';

describe('okr period rules', () => {
  it('supports month as a period type', () => {
    expect(PERIOD_TYPES).toContain('month');
  });

  it('labels month periods', () => {
    expect(getPeriodTypeLabel('month')).toBe('月度');
  });
});
