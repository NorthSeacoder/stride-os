'use client';

import { useActionState, useEffect, useState } from 'react';
import { Empty, ErrorAlert } from '@/components/ui';
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [createState, createAction] = useActionState(createTaskAction, initialState);
  const [updateState, updateAction] = useActionState(updateTaskAction, initialState);

  useEffect(() => {
    if (!createState.error) {
      setShowCreateForm(false);
    }
  }, [createState]);

  useEffect(() => {
    if (!updateState.error) {
      setEditingTask(null);
    }
  }, [updateState]);

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
            setEditingTask(null);
            setShowCreateForm(true);
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
            className={`rounded-xl border px-4 py-4 text-left transition-colors ${
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

      {showCreateForm && (
        <TaskForm
          action={createAction}
          error={createState.error}
          submitLabel="创建任务"
          keyResults={keyResults}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {editingTask && (
        <TaskForm
          action={updateAction}
          error={updateState.error}
          submitLabel="更新任务"
          task={editingTask}
          keyResults={keyResults}
          onCancel={() => setEditingTask(null)}
        />
      )}

      {activeView === 'today' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <TaskLane
            title="必做"
            subtitle="今天必须推进的事项。"
            items={today.must}
            emptyText='还没有必做任务。可以从收件箱或排期中拉一个进来。'
            onEdit={setEditingTask}
          />
          <TaskLane
            title="专注"
            subtitle="值得专门保护的深度工作。"
            items={today.focus}
            emptyText='还没有专注任务。新增今日任务时可选择专注。'
            onEdit={setEditingTask}
          />
        </div>
      )}

      {activeView === 'inbox' && (
        <TaskList
          title="收件箱"
          subtitle="新任务默认先进入这里。"
          items={inbox}
          emptyText='收件箱已清空。'
          onEdit={setEditingTask}
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
          onEdit={setEditingTask}
          showTodayActions
        />
      )}

      {activeView === 'done' && (
        <TaskList
          title="已完成"
          subtitle="已完成任务会保留 KR 上下文，便于后续复盘。"
          items={done}
          emptyText='还没有完成的任务。'
          onEdit={setEditingTask}
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
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4">
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
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4">
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
        <article key={task.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
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
                <form action={async (formData: FormData) => scheduleTaskAction(task.id, String(formData.get('scheduledDate') ?? '').trim())} className="flex gap-2">
                  <input type="date" name="scheduledDate" className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-2 text-sm text-[var(--text-primary)]" />
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

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
      {task && <input type="hidden" name="id" value={task.id} />}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{submitLabel}</h2>
        <button type="button" onClick={onCancel} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          取消
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-[var(--text-secondary)]">标题</span>
          <input name="title" required defaultValue={task?.title ?? ''} className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-[var(--text-secondary)]">状态</span>
          <select name="status" defaultValue={task?.status ?? 'inbox'} className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]">
            <option value="inbox">收件箱</option>
            <option value="today">今日</option>
            <option value="scheduled">已排期</option>
            <option value="done">已完成</option>
            <option value="canceled">已取消</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-[var(--text-secondary)]">今日类型</span>
          <select name="todayType" defaultValue={task?.todayType ?? ''} className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]">
            <option value="">无</option>
            <option value="must">必做</option>
            <option value="focus">专注</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-[var(--text-secondary)]">排期日期</span>
          <input type="date" name="scheduledDate" defaultValue={task?.scheduledDate ?? ''} className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-[var(--text-secondary)]">截止日期</span>
          <input type="date" name="dueDate" defaultValue={task?.dueDate ?? ''} className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-[var(--text-secondary)]">优先级</span>
          <select name="priority" defaultValue={task?.priority ?? ''} className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]">
            <option value="">无</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-[var(--text-secondary)]">精力消耗</span>
          <select name="energy" defaultValue={task?.energy ?? ''} className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]">
            <option value="">无</option>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-[var(--text-secondary)]">备注</span>
        <textarea name="notes" rows={3} defaultValue={task?.notes ?? ''} className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]" />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" name="important" defaultChecked={task?.important ?? false} />
          重要
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" name="urgent" defaultChecked={task?.urgent ?? false} />
          紧急
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-[var(--text-secondary)]">关联关键结果</span>
        <select
          name="keyResultIds"
          multiple
          defaultValue={Array.from(linkedKeyResultIds)}
          className="min-h-40 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          {keyResults.map((keyResult) => (
            <option key={keyResult.id} value={keyResult.id}>
              {keyResult.objectiveTitle} / {keyResult.title}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]">
        {submitLabel}
      </button>
    </form>
  );
}
