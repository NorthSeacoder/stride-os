'use client';

import { useActionState, useEffect, useState } from 'react';
import { Empty } from '@/components/ui';
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
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Examples</h1>
        <button
          type="button"
          onClick={startCreate}
          className="min-h-11 rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-contrast)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] sm:min-h-0"
        >
          Add Item
        </button>
      </div>

      {showCreateForm && (
        <ExampleForm
          action={createAction}
          error={createState.error}
          submitLabel="Create"
          onCancel={cancelCreate}
        />
      )}

      {editingItem && (
        <ExampleForm
          action={updateAction}
          error={updateState.error}
          submitLabel="Update"
          item={editingItem}
          onCancel={cancelEdit}
        />
      )}

      {items.length === 0 ? (
        <Empty text='No items yet. Click "Add Item" to create one.' />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-words font-medium text-[var(--text-primary)]">{item.title}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                    item.status === 'active' ? 'bg-[var(--success-bg)] text-[var(--success-text)]' :
                    item.status === 'archived' ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]' :
                    'bg-[var(--warning-bg)] text-[var(--warning-text)]'
                  }`}>
                    {item.status}
                  </span>
                  {item.notes && <span className="ml-2 break-words">{item.notes}</span>}
                </p>
              </div>
              <div className="flex shrink-0 gap-3">
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="min-h-11 rounded px-1 text-sm text-[var(--text-primary)] transition-colors hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] sm:min-h-0"
                >
                  Edit
                </button>
                <form
                  action={async () => {
                    await deleteExampleAction(item.id);
                  }}
                >
                  <button
                    type="submit"
                    className="min-h-11 rounded px-1 text-sm text-[var(--danger-text)] transition-colors hover:text-[var(--danger-text-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] sm:min-h-0"
                  >
                    Delete
                  </button>
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
    <form action={action} className="mb-6 space-y-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4">
      {item && <input type="hidden" name="id" value={item.id} />}
      {error && (
        <div className="rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3 text-sm text-[var(--danger-text)]">
          {error}
        </div>
      )}
      <div>
        <label htmlFor={`${submitLabel}-title`} className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Title</label>
        <input
          id={`${submitLabel}-title`}
          name="title"
          type="text"
          defaultValue={item?.title ?? ''}
          required
          className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        />
      </div>
      <div>
        <label htmlFor={`${submitLabel}-status`} className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Status</label>
        <select
          id={`${submitLabel}-status`}
          name="status"
          defaultValue={item?.status ?? 'active'}
          className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="draft">Draft</option>
        </select>
      </div>
      <div>
        <label htmlFor={`${submitLabel}-notes`} className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Notes</label>
        <textarea
          id={`${submitLabel}-notes`}
          name="notes"
          defaultValue={item?.notes ?? ''}
          rows={3}
          className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          className="min-h-11 rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-contrast)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] sm:min-h-0"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] sm:min-h-0"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
