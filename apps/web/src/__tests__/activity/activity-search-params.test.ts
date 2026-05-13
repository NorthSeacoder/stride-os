import { describe, expect, it } from 'vitest';
import {
  buildActivityHref,
  buildActivitySearchParams,
  buildRawSearchParams,
} from '@/lib/activity/search-params';

describe('activity search params', () => {
  it('omits empty and whitespace-only values from generated query strings', () => {
    const searchParams = buildActivitySearchParams([
      ['source', 'web'],
      ['action', ''],
      ['targetType', '   '],
      ['keyword', '  sprint review  '],
    ]);

    expect(searchParams.toString()).toBe('source=web&keyword=sprint+review');
  });

  it('supports repeated values and preserves only non-empty array entries', () => {
    const href = buildActivityHref('/activity', [
      ['source', ['web', '', 'api']],
      ['keyword', '   '],
    ]);

    expect(href).toBe('/activity?source=web&source=api');
  });

  it('reconstructs the raw query string without trimming values', () => {
    const searchParams = buildRawSearchParams([
      ['source', ''],
      ['keyword', '  review  '],
      ['action', ['task.update', '']],
    ]);

    expect(searchParams.toString()).toBe('source=&keyword=++review++&action=task.update&action=');
  });
});
