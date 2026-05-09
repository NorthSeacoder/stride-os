'use client';

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
        <div className="mb-4 rounded-md border border-[var(--success-border)] bg-[var(--success-bg)] p-4">
          <p className="text-sm font-medium text-[var(--success-text)]">
            Token created. Copy it now. It won&apos;t be shown again:
          </p>
          <code className="mt-2 block rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2 text-xs break-all text-[var(--text-primary)]">
            {createdToken}
          </code>
        </div>
      )}

      <form action={createAction} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="token-name" className="sr-only">Token name</label>
        <input
          id="token-name"
          name="name"
          type="text"
          placeholder="Token name"
          required
          className="flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        />
        <button
          type="submit"
          className="min-h-11 rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-contrast)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] sm:min-h-0"
        >
          Create
        </button>
      </form>

      {state.error && (
        <div className="mb-4 rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3 text-sm text-[var(--danger-text)]">
          {state.error}
        </div>
      )}

      {tokens.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No active tokens.</p>
      ) : (
        <div className="space-y-2">
          {tokens.map((token) => (
            <div key={token.id} className="flex flex-col gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-sm font-medium text-[var(--text-primary)]">{token.name}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Created: {new Date(token.createdAt).toLocaleDateString()}
                  {token.lastUsedAt && ` · Last used: ${new Date(token.lastUsedAt).toLocaleDateString()}`}
                </p>
              </div>
              <form
                action={async () => {
                  await revokeTokenAction(token.id);
                }}
              >
                <button
                  type="submit"
                  className="min-h-11 shrink-0 rounded px-1 text-left text-sm text-[var(--danger-text)] transition-colors hover:text-[var(--danger-text-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] sm:min-h-0"
                >
                  Revoke
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
