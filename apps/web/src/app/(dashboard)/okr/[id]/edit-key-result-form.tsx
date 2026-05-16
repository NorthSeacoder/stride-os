'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button, ErrorAlert, Modal, SelectField, TextField, TextareaField } from '@/components/ui';
import { archiveKeyResultAction, updateKeyResultAction, type OkrActionState } from '../actions';

const initialState: OkrActionState = { error: '' };

type KeyResultDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
};

export function EditKeyResultForm({ keyResult }: { keyResult: KeyResultDetail }) {
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editState, editAction] = useActionState(updateKeyResultAction, initialState);
  const [archiveState, archiveAction] = useActionState(archiveKeyResultAction, initialState);

  useEffect(() => {
    if (!editState.error) setEditOpen(false);
  }, [editState]);

  useEffect(() => {
    if (!archiveState.error) setArchiveOpen(false);
  }, [archiveState]);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
          编辑 KR
        </Button>
        <Button type="button" variant="ghost" onClick={() => setArchiveOpen(true)}>
          归档 KR
        </Button>
      </div>

      <Modal
        open={editOpen}
        onOpenChange={setEditOpen}
        title="编辑 KR"
      >
        <form action={editAction} className="space-y-3">
          <input type="hidden" name="keyResultId" value={keyResult.id} />
          {editState.error && <ErrorAlert message={editState.error} />}
          <TextField name="title" label="KR 标题" defaultValue={keyResult.title} required />
          <TextareaField name="description" label="补充说明" rows={3} defaultValue={keyResult.description ?? ''} />
          <SelectField
            name="status"
            label="状态"
            defaultValue={keyResult.status}
            options={[
              { value: 'active', label: '活跃' },
              { value: 'at_risk', label: '有风险' },
              { value: 'done', label: '完成' },
              { value: 'archived', label: '归档' },
            ]}
          />
          <div className="flex justify-end pt-1">
            <Button type="submit" variant="primary">保存 KR</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="归档 KR"
        description={`确认归档「${keyResult.title}」？`}
      >
        <form action={archiveAction} className="space-y-3">
          <input type="hidden" name="keyResultId" value={keyResult.id} />
          {archiveState.error && <ErrorAlert message={archiveState.error} />}
          <Button type="submit" variant="primary">确认归档 KR</Button>
        </form>
      </Modal>
    </>
  );
}
