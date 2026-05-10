'use client';

import { Button, ErrorAlert, SectionHeader, SurfacePanel, SelectField, TextareaField, TextField } from '@/components/ui';
import { useActionState } from 'react';
import { createKrCheckInAction, type OkrActionState } from '../actions';

const initialState: OkrActionState = { error: '' };

export function CheckInForm({ keyResultId }: { keyResultId: string }) {
  const [state, action] = useActionState(createKrCheckInAction, initialState);

  return (
    <SurfacePanel className="metal-frame instrument-surface p-5 md:p-6">
      <SectionHeader
        eyebrow="Progress Source"
        title="新增 Check-in"
        description="进展的真实来源在这里，不在任务完成数量里。"
      />
      <form action={action} className="mt-5 space-y-4">
        <input type="hidden" name="keyResultId" value={keyResultId} />
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
    </SurfacePanel>
  );
}
