import { describe, expect, it } from 'vitest';
import { v1Spec } from '../v1/openapi';

describe('v1 openapi contract', () => {
  it('includes personal okr alpha endpoints', () => {
    expect(v1Spec.paths['/okr/current']).toBeTruthy();
    expect(v1Spec.paths['/tasks/today']).toBeTruthy();
    expect(v1Spec.paths['/tasks/quadrants']).toBeTruthy();
    expect(v1Spec.paths['/key-results/{id}/check-ins']).toBeTruthy();
    expect(v1Spec.paths['/reviews/weekly/draft']).toBeTruthy();
    expect(v1Spec.paths['/reviews']).toBeTruthy();
    expect(v1Spec.paths['/reviews/{id}']).toBeTruthy();
  });
});
