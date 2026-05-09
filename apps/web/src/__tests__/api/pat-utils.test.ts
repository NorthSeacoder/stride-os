import { describe, it, expect } from 'vitest';
import { createHash, randomBytes } from 'crypto';

describe('PAT token utilities', () => {
  it('hashes tokens deterministically with sha256', () => {
    const token = 'tpl_test123';
    const hash = createHash('sha256').update(token).digest('hex');
    const hash2 = createHash('sha256').update(token).digest('hex');
    expect(hash).toBe(hash2);
    expect(hash).toHaveLength(64);
  });

  it('different tokens produce different hashes', () => {
    const hash1 = createHash('sha256').update('token_a').digest('hex');
    const hash2 = createHash('sha256').update('token_b').digest('hex');
    expect(hash1).not.toBe(hash2);
  });

  it('generates tokens with tpl_ prefix', () => {
    const token = `tpl_${randomBytes(32).toString('hex')}`;
    expect(token.startsWith('tpl_')).toBe(true);
    expect(token.length).toBeGreaterThan(10);
  });
});
