'use client';

import { Button, ErrorAlert, FeedbackAlert, TextField } from '@/components/ui';
import { useActionState } from 'react';
import { createTokenAction, revokeTokenAction, type TokenActionState } from './actions';

type Token = {
  id: string;
  name: string;
  lastUsedAt: Date | string | null;
  expiresAt: Date | string | null;
  createdAt: Date | string;
  revokedAt: Date | string | null;
};

const initialState: TokenActionState = {
  error: '',
};

export function TokensClient({
  tokens,
  createdToken,
}: {
  tokens: Token[];
  createdToken: string | null;
}) {
  const [state, createAction] = useActionState(createTokenAction, initialState);

  return (
    <div>
      {createdToken && (
        <div className="mb-4 space-y-3 rounded-md border border-[var(--success-border)] bg-[var(--success-bg)] p-4">
          <FeedbackAlert tone="success" message="令牌已创建，请立即复制。关闭后不会再次显示：" />
          <code className="mt-2 block rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2 text-xs break-all text-[var(--text-primary)]">
            {createdToken}
          </code>
        </div>
      )}

      <form action={createAction} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <TextField
          id="token-name"
          name="name"
          label="令牌名称"
          placeholder="令牌名称"
          required
          className="flex-1"
        />
        <Button type="submit" variant="primary">
          创建
        </Button>
      </form>

      {state.error && <ErrorAlert message={state.error} />}

      {tokens.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">暂无可用令牌。</p>
      ) : (
        <div className="space-y-2">
          {tokens.map((token) => (
            <div key={token.id} className="flex flex-col gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-sm font-medium text-[var(--text-primary)]">{token.name}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  创建于：{new Date(token.createdAt).toLocaleDateString()}
                  {token.lastUsedAt && ` · 最近使用：${new Date(token.lastUsedAt).toLocaleDateString()}`}
                </p>
              </div>
              <form
                action={async () => {
                  await revokeTokenAction(token.id);
                }}
              >
                <Button type="submit" variant="danger" className="min-h-11 shrink-0 px-1 sm:min-h-0">
                  吊销
                </Button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
