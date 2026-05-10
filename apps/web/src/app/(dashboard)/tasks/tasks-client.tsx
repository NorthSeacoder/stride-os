'use client';

import { useActionState, useEffect, useState } from 'react';
import {
  CheckboxField,
  DatePickerField,
  Empty,
  ErrorAlert,
  Modal,
  SelectField,
  TextareaField,
  TextField,
} from '@/components/ui';
import {
  getTaskEnergyLabel,
  getTaskPriorityLabel,
  getTaskStatusLabel,
  getTodayTypeLabel,
} from '@/lib/presentation/labels';
import {
  cancelTaskAction,
  completeTaskAction,
  createTaskAction,
  moveTaskToTodayAction,
  scheduleTaskAction,
  updateTaskAction,
  type TaskActionState,
} from './actions';

type LinkedKeyResult = {
  id: string;
  title: string;
};

type TaskItem = {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  todayType: string | null;
  scheduledDate: string | null;
  dueDate: string | null;
  important: boolean;
  urgent: boolean;
  priority: string | null;
  energy: string | null;
  completedAt: Date | string | null;
  keyResultLinks?: Array<{
    keyResult: LinkedKeyResult;
  }>;
};

type KeyResultOption = {
  id: string;
  title: string;
  objectiveTitle: string;
};

const initialState: TaskActionState = {
  error: '',
};

type TaskModalState =
  | { mode: 'create'; task?: never }
  | { mode: 'edit'; task: TaskItem }
  | null;

export function TasksClient({
  today,
  inbox,
  scheduled,
  done,
  keyResults,
}: {
  today: { must: TaskItem[]; focus: TaskItem[] };
  inbox: TaskItem[];
  scheduled: TaskItem[];
  done: TaskItem[];
  keyResults: KeyResultOption[];
}) {
  const [activeView, setActiveView] = useState<'today' | 'inbox' | 'scheduled' | 'done'>('today');
  const [taskModal, setTaskModal] = useState<TaskModalState>(null);
  const [hasSubmittedCreate, setHasSubmittedCreate] = useState(false);
  const [hasSubmittedUpdate, setHasSubmittedUpdate] = useState(false);
  const [createState, createAction] = useActionState(createTaskAction, initialState);
  const [updateState, updateAction] = useActionState(updateTaskAction, initialState);

  useEffect(() => {
    if (hasSubmittedCreate && !createState.error) {
      setTaskModal(null);
      setHasSubmittedCreate(false);
    }
  }, [createState, hasSubmittedCreate]);

  useEffect(() => {
    if (hasSubmittedUpdate && !updateState.error) {
      setTaskModal(null);
      setHasSubmittedUpdate(false);
    }
  }, [updateState, hasSubmittedUpdate]);

  const viewCounts = {
    today: today.must.length + today.focus.length,
    inbox: inbox.length,
    scheduled: scheduled.length,
    done: done.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">每日执行</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">任务</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
            默认进入今日视图。你可以从收件箱或排期任务中拉取任务，标记为必做或专注，并把 KR 关联到执行动作上。
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setTaskModal({ mode: 'create' });
            setHasSubmittedCreate(false);
          }}
          className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-panel-contrast)]"
        >
          新建任务
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {(['today', 'inbox', 'scheduled', 'done'] as const).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => setActiveView(view)}
            className={`rounded-lg border px-4 py-4 text-left transition-colors ${
              activeView === view
                ? 'border-[var(--border-strong)] bg-[var(--bg-panel-strong)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{getTaskStatusLabel(view)}</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{viewCounts[view]}</p>
          </button>
        ))}
      </div>

      <Modal
        open={taskModal !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTaskModal(null);
            setHasSubmittedCreate(false);
            setHasSubmittedUpdate(false);
          }
        }}
        title={taskModal?.mode === 'edit' ? '编辑任务' : '新建任务'}
        description="先记录最小可执行信息，需要时再补充上下文。"
      >
        {taskModal?.mode === 'create' && (
        <TaskForm
          action={(formData) => {
            setHasSubmittedCreate(true);
            createAction(formData);
          }}
          error={createState.error}
          submitLabel="创建任务"
          keyResults={keyResults}
          onCancel={() => setTaskModal(null)}
        />
        )}
        {taskModal?.mode === 'edit' && (
        <TaskForm
          action={(formData) => {
            setHasSubmittedUpdate(true);
            updateAction(formData);
          }}
          error={updateState.error}
          submitLabel="更新任务"
          task={taskModal.task}
          keyResults={keyResults}
          onCancel={() => setTaskModal(null)}
        />
        )}
      </Modal>

      {activeView === 'today' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <TaskLane
            title="必做"
            subtitle="今天必须推进的事项。"
            items={today.must}
            emptyText='还没有必做任务。可以从收件箱或排期中拉一个进来。'
            onEdit={(task) => setTaskModal({ mode: 'edit', task })}
          />
          <TaskLane
            title="专注"
            subtitle="值得专门保护的深度工作。"
            items={today.focus}
            emptyText='还没有专注任务。新增今日任务时可选择专注。'
            onEdit={(task) => setTaskModal({ mode: 'edit', task })}
          />
        </div>
      )}

      {activeView === 'inbox' && (
        <TaskList
          title="收件箱"
          subtitle="新任务默认先进入这里。"
          items={inbox}
          emptyText='收件箱已清空。'
          onEdit={(task) => setTaskModal({ mode: 'edit', task })}
          showTodayActions
          showScheduleAction
        />
      )}

      {activeView === 'scheduled' && (
        <TaskList
          title="已排期"
          subtitle="有明确日期、等待合适时机执行的任务。"
          items={scheduled}
          emptyText='暂无排期任务。'
          onEdit={(task) => setTaskModal({ mode: 'edit', task })}
          showTodayActions
        />
      )}

      {activeView === 'done' && (
        <TaskList
          title="已完成"
          subtitle="已完成任务会保留 KR 上下文，便于后续复盘。"
          items={done}
          emptyText='还没有完成的任务。'
          onEdit={(task) => setTaskModal({ mode: 'edit', task })}
        />
      )}
    </div>
  );
}

function TaskLane({
  title,
  subtitle,
  items,
  emptyText,
  onEdit,
}: {
  title: string;
  subtitle: string;
  items: TaskItem[];
  emptyText: string;
  onEdit: (task: TaskItem) => void;
}) {
  return (
    <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
      </div>
      {items.length === 0 ? <Empty text={emptyText} /> : <TaskCards items={items} onEdit={onEdit} />}
    </section>
  );
}

function TaskList({
  title,
  subtitle,
  items,
  emptyText,
  onEdit,
  showTodayActions = false,
  showScheduleAction = false,
}: {
  title: string;
  subtitle: string;
  items: TaskItem[];
  emptyText: string;
  onEdit: (task: TaskItem) => void;
  showTodayActions?: boolean;
  showScheduleAction?: boolean;
}) {
  return (
    <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
      </div>
      {items.length === 0 ? (
        <Empty text={emptyText} />
      ) : (
        <TaskCards items={items} onEdit={onEdit} showTodayActions={showTodayActions} showScheduleAction={showScheduleAction} />
      )}
    </section>
  );
}

function TaskCards({
  items,
  onEdit,
  showTodayActions = false,
  showScheduleAction = false,
}: {
  items: TaskItem[];
  onEdit: (task: TaskItem) => void;
  showTodayActions?: boolean;
  showScheduleAction?: boolean;
}) {
  return (
    <div className="space-y-3">
      {items.map((task) => (
        <article key={task.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-medium text-[var(--text-primary)]">{task.title}</h3>
                {task.todayType && (
                  <span className="rounded-full bg-[var(--bg-panel-strong)] px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                    {getTodayTypeLabel(task.todayType)}
                  </span>
                )}
                {task.important && <span className="text-xs text-[var(--warning-text)]">重要</span>}
                {task.urgent && <span className="text-xs text-[var(--danger-text)]">紧急</span>}
              </div>
              {task.notes && <p className="mt-2 text-sm text-[var(--text-secondary)]">{task.notes}</p>}
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                <span>{getTaskStatusLabel(task.status)}</span>
                {task.scheduledDate && <span>排期 {task.scheduledDate}</span>}
                {task.dueDate && <span>截止 {task.dueDate}</span>}
                {task.completedAt && <span>完成于 {String(task.completedAt).slice(0, 10)}</span>}
                {task.priority && <span>优先级 {getTaskPriorityLabel(task.priority)}</span>}
                {task.energy && <span>精力 {getTaskEnergyLabel(task.energy)}</span>}
              </div>
              {task.keyResultLinks && task.keyResultLinks.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {task.keyResultLinks.map((link) => (
                    <a
                      key={link.keyResult.id}
                      href={`/okr/${link.keyResult.id}`}
                      className="rounded-full border border-[var(--border-subtle)] px-2 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      {link.keyResult.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onEdit(task)}
                className="rounded-md border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-panel)] hover:text-[var(--text-primary)]"
              >
                编辑
              </button>
              {task.status !== 'done' && (
                <form action={async () => completeTaskAction(task.id)}>
                  <button type="submit" className="rounded-md border border-[var(--success-border)] px-3 py-2 text-sm text-[var(--success-text)]">
                    完成
                  </button>
                </form>
              )}
              {showTodayActions && (
                <>
                  <form action={async () => moveTaskToTodayAction(task.id, 'must')}>
                    <button type="submit" className="rounded-md border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                      今日必做
                    </button>
                  </form>
                  <form action={async () => moveTaskToTodayAction(task.id, 'focus')}>
                    <button type="submit" className="rounded-md border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                      今日专注
                    </button>
                  </form>
                </>
              )}
              {showScheduleAction && (
                <form action={async (formData: FormData) => scheduleTaskAction(task.id, String(formData.get('scheduledDate') ?? '').trim())} className="flex min-w-56 gap-2">
                  <DatePickerField name="scheduledDate" label="排期日期" allowClear={false} />
                  <button type="submit" className="rounded-md border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                    排期
                  </button>
                </form>
              )}
              {task.status !== 'canceled' && task.status !== 'done' && (
                <form action={async () => cancelTaskAction(task.id)}>
                  <button type="submit" className="rounded-md border border-[var(--danger-border)] px-3 py-2 text-sm text-[var(--danger-text)]">
                    取消
                  </button>
                </form>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function TaskForm({
  action,
  error,
  submitLabel,
  task,
  keyResults,
  onCancel,
}: {
  action: (formData: FormData) => void;
  error: string;
  submitLabel: string;
  task?: TaskItem;
  keyResults: KeyResultOption[];
  onCancel: () => void;
}) {
  const linkedKeyResultIds = new Set((task?.keyResultLinks ?? []).map((link) => link.keyResult.id));
  const statusOptions = [
    { value: 'inbox', label: '收件箱' },
    { value: 'today', label: '今日' },
    { value: 'scheduled', label: '已排期' },
    { value: 'done', label: '已完成' },
    { value: 'canceled', label: '已取消' },
  ];
  const todayTypeOptions = [
    { value: '', label: '无' },
    { value: 'must', label: '必做' },
    { value: 'focus', label: '专注' },
  ];
  const priorityOptions = [
    { value: '', label: '无' },
    { value: 'P1', label: 'P1' },
    { value: 'P2', label: 'P2' },
    { value: 'P3', label: 'P3' },
  ];
  const energyOptions = [
    { value: '', label: '无' },
    { value: 'low', label: '低' },
    { value: 'medium', label: '中' },
    { value: 'high', label: '高' },
  ];
  const keyResultOptions = keyResults.map((keyResult) => ({
    value: keyResult.id,
    label: `${keyResult.objectiveTitle} / ${keyResult.title}`,
  }));

  return (
    <form action={action} className="space-y-5">
      {task && <input type="hidden" name="id" value={task.id} />}
      {error && <ErrorAlert message={error} />}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <TextField name="title" label="标题" required defaultValue={task?.title ?? ''} autoFocus />
        </div>
        <SelectField name="status" label="状态" defaultValue={task?.status ?? 'inbox'} options={statusOptions} />
        <SelectField name="todayType" label="今日类型" defaultValue={task?.todayType ?? ''} options={todayTypeOptions} />
        <DatePickerField name="scheduledDate" label="排期日期" defaultValue={task?.scheduledDate ?? ''} />
        <DatePickerField name="dueDate" label="截止日期" defaultValue={task?.dueDate ?? ''} />
        <SelectField name="priority" label="优先级" defaultValue={task?.priority ?? ''} options={priorityOptions} />
        <SelectField name="energy" label="精力消耗" defaultValue={task?.energy ?? ''} options={energyOptions} />
      </div>

      <TextareaField name="notes" label="备注" rows={3} defaultValue={task?.notes ?? ''} />

      <div className="grid gap-3 md:grid-cols-2">
        <CheckboxField name="important" label="重要" defaultChecked={task?.important ?? false} />
        <CheckboxField name="urgent" label="紧急" defaultChecked={task?.urgent ?? false} />
      </div>

      <SelectField
        name="keyResultIds"
        label="关联关键结果"
        multiple
        size={6}
        defaultValue={Array.from(linkedKeyResultIds).join(',')}
        options={keyResultOptions}
      />

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-[var(--border-subtle)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]">
          取消
        </button>
        <button type="submit" className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
