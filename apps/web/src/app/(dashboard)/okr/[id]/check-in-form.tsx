'use client';

import { Button, ErrorAlert, SectionHeader, SurfacePanel, TextareaField } from '@/components/ui';
import { useActionState } from 'react';
import { createKrCheckInAction, type OkrActionState } from '../actions';

const initialState: OkrActionState = { error: '' };

export function CheckInForm({ keyResultId }: { keyResultId: string }) {
  const [state, action] = useActionState(createKrCheckInAction, initialState);

  return (
    <SurfacePanel className="metal-frame instrument-surface p-3.5">
      <SectionHeader title="新增 Check-in" />
      <form action={action} className="mt-3 space-y-3">
        <input type="hidden" name="keyResultId" value={keyResultId} />
        {state.error && <ErrorAlert message={state.error} />}
        <TextareaField name="summary" label="总结" rows={3} />
        <TextareaField name="blockers" label="阻塞项" rows={2} />
        <TextareaField name="nextActions" label="下一步动作" rows={2} />
        <Button type="submit" variant="primary">
          保存 Check-in
        </Button>
      </form>
    </SurfacePanel>
  );
}
