'use client';

import { Badge, Button, Empty, ErrorAlert, PageIntro, SelectField, SurfacePanel, TextareaField, TextField } from '@/components/ui';
import { useActionState, useEffect, useState } from 'react';
import { getExampleStatusLabel } from '@/lib/presentation/labels';
import {
  createExampleAction,
  deleteExampleAction,
  updateExampleAction,
  type ExampleActionState,
} from './actions';

type ExampleItem = {
  id: string;
  title: string;
  status: string;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const initialState: ExampleActionState = {
  error: '',
};

export function ExamplesClient({ items }: { items: ExampleItem[] }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ExampleItem | null>(null);
  const [createState, createAction] = useActionState(createExampleAction, initialState);
  const [updateState, updateAction] = useActionState(updateExampleAction, initialState);

  useEffect(() => {
    if (!createState.error) {
      setShowCreateForm(false);
    }
  }, [createState]);

  useEffect(() => {
    if (!updateState.error) {
      setEditingItem(null);
    }
  }, [updateState]);

  function startCreate() {
    setEditingItem(null);
    setShowCreateForm(true);
  }

  function cancelCreate() {
    setShowCreateForm(false);
  }

  function startEdit(item: ExampleItem) {
    setShowCreateForm(false);
    setEditingItem(item);
  }

  function cancelEdit() {
    setEditingItem(null);
  }

  return (
    <div className="space-y-3">
      <PageIntro
        eyebrow="Examples"
        title="示例"
        description="用于验证基础增删改流程的轻量数据集。"
        action={
          <Button type="button" variant="primary" onClick={startCreate}>
            新增条目
          </Button>
        }
      />

      {showCreateForm && (
        <ExampleForm
          action={createAction}
          error={createState.error}
          submitLabel="创建"
          onCancel={cancelCreate}
        />
      )}

      {editingItem && (
        <ExampleForm
          action={updateAction}
          error={updateState.error}
          submitLabel="更新"
          item={editingItem}
          onCancel={cancelEdit}
        />
      )}

      {items.length === 0 ? (
        <Empty text='还没有条目。点击“新增条目”创建。' />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="metal-frame flex flex-col gap-2 rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-words font-medium text-[var(--text-primary)]">{item.title}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  <Badge tone={item.status === 'active' ? 'success' : item.status === 'archived' ? 'neutral' : 'warning'}>
                    {getExampleStatusLabel(item.status)}
                  </Badge>
                  {item.notes && <span className="ml-2 break-words">{item.notes}</span>}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(item)}>
                  编辑
                </Button>
                <form
                  action={async () => {
                    await deleteExampleAction(item.id);
                  }}
                >
                  <Button type="submit" variant="danger" size="sm">
                    删除
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExampleForm({
  action,
  error,
  submitLabel,
  item,
  onCancel,
}: {
  action: (formData: FormData) => void;
  error: string;
  submitLabel: string;
  item?: ExampleItem;
  onCancel: () => void;
}) {
  return (
    <SurfacePanel className="metal-frame instrument-surface mb-3 p-3.5">
      <form action={action} className="space-y-3">
      {item && <input type="hidden" name="id" value={item.id} />}
      {error && <ErrorAlert message={error} />}
      <TextField id={`${submitLabel}-title`} name="title" label="标题" defaultValue={item?.title ?? ''} required />
      <SelectField
        name="status"
        label="状态"
        defaultValue={item?.status ?? 'active'}
        options={[
          { value: 'active', label: '启用' },
          { value: 'archived', label: '已归档' },
          { value: 'draft', label: '草稿' },
        ]}
      />
      <TextareaField id={`${submitLabel}-notes`} name="notes" label="备注" defaultValue={item?.notes ?? ''} rows={3} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
      </div>
      </form>
    </SurfacePanel>
  );
}
