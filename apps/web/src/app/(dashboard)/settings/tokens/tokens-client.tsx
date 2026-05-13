'use client';

import { Button, Empty, ErrorAlert, FeedbackAlert, PageIntro, SectionHeader, SurfacePanel, TextField } from '@/components/ui';
import { useActionState } from 'react';
import { createTokenAction, revokeTokenAction, type TokenActionState } from './actions';
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
          {createdToken && (
            <SurfacePanel className="metal-frame instrument-surface p-3.5">
              <FeedbackAlert tone="success" message="令牌已创建，请立即复制。关闭后不会再次显示：" />
              <code className="mt-3 block rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-3 text-xs break-all text-(--text-primary)">
                {createdToken}
              </code>
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
