import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const insertValues = vi.fn();
  const updateSet = vi.fn();
  const updateWhere = vi.fn();
  const findFirst = vi.fn();
  const insert = vi.fn((table: unknown) => ({
    values: (values: unknown) => {
      insertValues(table, values);
      return {
        returning: vi.fn(async () => [{ id: 'token_1' }]),
      };
    },
  }));

  return {
    findFirst,
    insert,
    insertValues,
    updateSet,
    updateWhere,
  };
});

vi.mock('@stride-os/db', () => {
  const schema = {
    apiTokens: {
      id: 'api_tokens.id',
      tokenHash: 'api_tokens.token_hash',
      userId: 'api_tokens.user_id',
      revokedAt: 'api_tokens.revoked_at',
      createdAt: 'api_tokens.created_at',
    },
    auditLogs: { id: 'audit_logs.id' },
  };

  return {
    db: {
      insert: mocks.insert,
      update: vi.fn(() => ({
        set: (values: unknown) => {
          mocks.updateSet(values);
          return { where: (...args: unknown[]) => mocks.updateWhere(...args) };
        },
      })),
      query: {
        apiTokens: {
          findFirst: mocks.findFirst,
          findMany: vi.fn(async () => []),
        },
      },
    },
    schema,
  };
});

import { createApiToken, revokeApiToken } from '@/lib/auth/pat';

describe('personal access token activity logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue({
      id: 'token_1',
      name: 'Hermes import',
      userId: 'user_1',
    });
  });

  it('records token creation with source and target title', async () => {
    await createApiToken('user_1', 'Hermes import');

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'audit_logs.id' }),
      expect.objectContaining({
        actorType: 'user',
        actorId: 'user_1',
        action: 'token.create',
        targetType: 'api_token',
        targetId: 'token_1',
        targetTitle: 'Hermes import',
        source: 'web',
        summary: 'Created API token Hermes import',
      }),
    );
  });

  it('records token revocation with source and target title', async () => {
    await revokeApiToken('user_1', 'token_1');

    expect(mocks.updateSet).toHaveBeenCalledWith(expect.objectContaining({ revokedAt: expect.any(Date) }));
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'audit_logs.id' }),
      expect.objectContaining({
        actorType: 'user',
        actorId: 'user_1',
        action: 'token.revoke',
        targetType: 'api_token',
        targetId: 'token_1',
        targetTitle: 'Hermes import',
        source: 'web',
        summary: 'Revoked API token Hermes import',
      }),
    );
  });
});
