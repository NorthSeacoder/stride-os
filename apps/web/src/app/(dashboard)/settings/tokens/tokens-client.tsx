'use client';

import { Button, Empty, ErrorAlert, FeedbackAlert, PageIntro, SectionHeader, SurfacePanel, TextField } from '@/components/ui';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { clearCreatedTokenAction, createTokenAction, revokeTokenAction, type TokenActionState } from './actions';
import { SettingsNav } from '../settings-nav';

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
  const [isCreatedTokenVisible, setIsCreatedTokenVisible] = useState(Boolean(createdToken));
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [clearError, setClearError] = useState('');
  const [isClearPending, startClearTransition] = useTransition();

  useEffect(() => {
    setIsCreatedTokenVisible(Boolean(createdToken));
    setCopyState('idle');
    setClearError('');
  }, [createdToken]);

  async function copyCreatedToken() {
    if (!createdToken) return;

    try {
      await navigator.clipboard.writeText(createdToken);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  function dismissCreatedToken() {
    setClearError('');
    startClearTransition(() => {
      void (async () => {
        try {
          await clearCreatedTokenAction();
          setIsCreatedTokenVisible(false);
        } catch {
          setClearError('关闭失败，请稍后重试。');
        }
      })();
    });
  }

  return (
    <div className="space-y-3">
      <PageIntro
        eyebrow="系统控制"
        title="API 令牌"
        description="在这里创建和吊销用于集成与自动化访问的令牌。"
      />

      <div className="grid gap-3 xl:grid-cols-[240px_minmax(0,1fr)]">
        <SurfacePanel className="metal-frame instrument-surface p-3.5">
          <SectionHeader
            eyebrow="Control Index"
            title="设置分组"
            description="账户与令牌共享同一套控制台导航。"
          />
          <SettingsNav />
        </SurfacePanel>

        <div className="space-y-3">
          {createdToken && isCreatedTokenVisible && (
            <SurfacePanel className="metal-frame instrument-surface p-3.5">
              <FeedbackAlert tone="success" message="令牌已创建。请复制并妥善保存，关闭后不会再次显示：" />
              <code className="mt-3 block rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-3 text-xs break-all text-(--text-primary)">
                {createdToken}
              </code>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button type="button" variant="primary" size="sm" onClick={copyCreatedToken}>
                  {copyState === 'copied' ? '已复制' : '复制令牌'}
                </Button>
                <Button type="button" variant="secondary" size="sm" pending={isClearPending} onClick={dismissCreatedToken}>
                  关闭
                </Button>
                {copyState === 'failed' && (
                  <p className="text-xs text-(--danger-text)">复制失败，请手动选中令牌复制。</p>
                )}
                {clearError && (
                  <p className="text-xs text-(--danger-text)">{clearError}</p>
                )}
              </div>
            </SurfacePanel>
          )}

          <SurfacePanel className="metal-frame instrument-surface p-3.5">
            <SectionHeader
              eyebrow="Create Token"
              title="创建令牌"
              description="用明确名称区分不同集成来源。"
            />
            <form action={createAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
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
            {state.error && <div className="mt-4"><ErrorAlert message={state.error} /></div>}
          </SurfacePanel>

          <SurfacePanel className="metal-frame instrument-surface p-3.5">
            <SectionHeader
              eyebrow="Token List"
              title="现有令牌"
              description="已创建令牌的状态与最近使用信息。"
            />
            <div className="mt-3 space-y-2">
              {tokens.length === 0 ? (
                <Empty text="暂无可用令牌。" />
              ) : (
                tokens.map((token) => (
                  <div key={token.id} className="metal-frame flex flex-col gap-2 rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-(--text-primary)">{token.name}</p>
                      <p className="mt-2 text-xs text-(--text-secondary)">
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
                ))
              )}
            </div>
          </SurfacePanel>
        </div>
      </div>
    </div>
  );
}
