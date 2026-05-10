'use client';

import { Button, ErrorAlert, SelectField, TextareaField, TextField } from '@/components/ui';
import { useActionState } from 'react';
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
        <TextField name="progressValue" label="进度值" type="number" step="0.01" />
        <SelectField
          name="confidence"
          label="信心"
          defaultValue="medium"
          options={[
            { value: 'low', label: '低' },
            { value: 'medium', label: '中' },
            { value: 'high', label: '高' },
          ]}
        />
      </div>
      <TextareaField name="summary" label="总结" rows={2} />
      <TextareaField name="blockers" label="阻塞项" rows={2} />
      <TextareaField name="nextActions" label="下一步动作" rows={2} />
      <Button type="submit" variant="primary">
        保存 Check-in
      </Button>
    </form>
  );
}
