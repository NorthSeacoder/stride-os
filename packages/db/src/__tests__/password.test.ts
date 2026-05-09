import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../utils/password';

describe('password utils', () => {
  it('hashes and verifies a password', async () => {
    const hashed = await hashPassword('secret123');
    expect(hashed).not.toBe('secret123');
    expect(await verifyPassword('secret123', hashed)).toBe(true);
    expect(await verifyPassword('wrong', hashed)).toBe(false);
  });
});
