'use client';

import { useActionState } from 'react';
import { ErrorAlert } from '@/components/ui';
import { createKrCheckInAction, type OkrActionState } from '../actions';

const initialState: OkrActionState = { error: '' };

export function CheckInForm({ keyResultId }: { keyResultId: string }) {
  const [state, action] = useActionState(createKrCheckInAction, initialState);

  return (
    <form action={action} className="space-y-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
      <input type="hidden" name="keyResultId" value={keyResultId} />
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">新增 Check-in</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">进展的真实来源在这里，不在任务完成数量里。</p>
      </div>
      {state.error && <ErrorAlert message={state.error} />}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-[var(--text-secondary)]">进度值</span>
          <input name="progressValue" type="number" step="0.01" className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-[var(--text-secondary)]">信心</span>
          <select name="confidence" defaultValue="medium" className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]">
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm text-[var(--text-secondary)]">总结</span>
        <textarea name="summary" rows={2} className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-[var(--text-secondary)]">阻塞项</span>
        <textarea name="blockers" rows={2} className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-[var(--text-secondary)]">下一步动作</span>
        <textarea name="nextActions" rows={2} className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]" />
      </label>
      <button type="submit" className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]">
        保存 Check-in
      </button>
    </form>
  );
}
