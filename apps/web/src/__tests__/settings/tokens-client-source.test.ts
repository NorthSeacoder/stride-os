import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('apps/web/src/app/(dashboard)/settings/tokens/tokens-client.tsx', 'utf8');

describe('TokensClient one-time token handling', () => {
  it('keeps the created token visible until the user explicitly closes it', () => {
    expect(source).toContain('isCreatedTokenVisible');
    expect(source).toContain('clearCreatedTokenAction');
    expect(source).toContain('setIsCreatedTokenVisible(false)');
    expect(source).not.toContain(`if (!createdToken) return;
    startClearTransition`);
  });

  it('offers copy and manual fallback actions for the one-time token', () => {
    expect(source).toContain('navigator.clipboard.writeText(createdToken)');
    expect(source).toContain('复制令牌');
    expect(source).toContain('复制失败，请手动选中令牌复制。');
  });
});
