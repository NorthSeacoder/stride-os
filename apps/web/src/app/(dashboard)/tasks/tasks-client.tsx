'use client';

import { useForm } from '@tanstack/react-form';
import { useRouter } from 'next/navigation';
import { startTransition, useActionState, useEffect, useMemo, useState } from 'react';
import {
  ActionStatus,
  Badge,
  Button,
  CheckboxField,
  DatePickerField,
  Empty,
  ErrorAlert,
  getFieldError,
  Modal,
  SelectField,
  TextareaField,
  TextField,
} from '@/components/ui';
import {
  createTaskListAction,
  createTaskAction,
  createTaskDefinitionAction,
  toggleTaskCompletionAction,
  updateTaskAction,
  updateTaskDefinitionAction,
  type TaskActionState,
} from './actions';
import { buildTaskFormData, getTaskFormValues } from './task-form-bridge';
import type { TaskGroup, TaskSourceSummary } from '@/lib/services/task-service';

type LinkedKeyResult = {
  id: string;
  title: string;
};

type TaskItem = {
  id: string;
  title: string;
  notes: string | null;
  description?: string | null;
  status: string;
  dueDate: string | null;
  priority: string | null;
  energy: string | null;
  completedAt: Date | string | null;
  listId?: string | null;
  definition?: {
    id: string;
    frequency: string;
    endType: string;
    endDate?: string | null;
    occurrenceCount?: number | null;
  } | null;
  list?: {
    id: string;
    name: string;
    slug?: string;
  } | null;
  keyResultLinks?: Array<{
    keyResult: LinkedKeyResult;
  }>;
};

type KeyResultOption = {
  id: string;
  title: string;
  objectiveTitle: string;
};

type WorkspaceData = {
  sources: TaskSourceSummary[];
  sourceGroups: Record<string, TaskGroup[]>;
  initialSourceId: string | null;
  initialGroups: TaskGroup[];
  initialTaskDetail: TaskItem | null;
};

type TaskModalState =
  | { mode: 'create'; task?: never }
  | { mode: 'edit'; task: TaskItem }
  | null;

const initialState: TaskActionState = {
  error: '',
};

const GROUP_ORDER = ['overdue', 'today', 'tomorrow', 'upcoming', 'no-date', 'completed'] as const;

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeDateValue(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return typeof value === 'string' ? value : formatDateOnly(value);
}

function deriveGroupKey(task: Pick<TaskItem, 'dueDate' | 'completedAt' | 'status'>): TaskGroup['key'] {
  if (task.completedAt || task.status === 'done') {
    return 'completed';
  }

  const dueDate = normalizeDateValue(task.dueDate);
  if (!dueDate) {
    return 'no-date';
  }

  const today = formatDateOnly(new Date());
  const tomorrow = formatDateOnly(addDays(new Date(), 1));

  if (dueDate < today) {
    return 'overdue';
  }

  if (dueDate === today) {
    return 'today';
  }

  if (dueDate === tomorrow) {
    return 'tomorrow';
  }

  return 'upcoming';
}

export function TasksClient({
  keyResults,
  workspaceData,
}: {
  keyResults: KeyResultOption[];
  workspaceData?: WorkspaceData;
}) {
  const router = useRouter();
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(workspaceData?.initialSourceId ?? null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(workspaceData?.initialTaskDetail?.id ?? null);
  const [sourceGroupsState, setSourceGroupsState] = useState<Record<string, TaskGroup[]>>(workspaceData?.sourceGroups ?? {});
  const [taskModal, setTaskModal] = useState<TaskModalState>(null);
  const [showCreateList, setShowCreateList] = useState(false);
  const [hasSubmittedCreate, setHasSubmittedCreate] = useState(false);
  const [hasSubmittedUpdate, setHasSubmittedUpdate] = useState(false);
  const [hasSubmittedListCreate, setHasSubmittedListCreate] = useState(false);
  const [createState, createAction] = useActionState(createTaskAction, initialState);
  const [updateState, updateAction] = useActionState(updateTaskAction, initialState);
  const [createDefinitionState, createDefinitionAction] = useActionState(createTaskDefinitionAction, initialState);
  const [updateDefinitionState, updateDefinitionAction] = useActionState(updateTaskDefinitionAction, initialState);
  const [createListState, createListAction] = useActionState(createTaskListAction, initialState);

  const sources = workspaceData?.sources ?? [];

  useEffect(() => {
    setSourceGroupsState(workspaceData?.sourceGroups ?? {});
  }, [workspaceData?.sourceGroups]);

  useEffect(() => {
    if (hasSubmittedCreate && !createState.error && !createDefinitionState.error) {
      router.refresh();
      setTaskModal(null);
      setHasSubmittedCreate(false);
    }
  }, [createDefinitionState.error, createState.error, hasSubmittedCreate, router]);

  useEffect(() => {
    if (hasSubmittedUpdate && !updateState.error && !updateDefinitionState.error) {
      router.refresh();
      setTaskModal(null);
      setHasSubmittedUpdate(false);
    }
  }, [hasSubmittedUpdate, router, updateDefinitionState.error, updateState.error]);

  useEffect(() => {
    if (hasSubmittedListCreate && !createListState.error) {
      router.refresh();
      setShowCreateList(false);
      setHasSubmittedListCreate(false);
    }
  }, [createListState.error, hasSubmittedListCreate, router]);

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId) ?? sources[0] ?? null,
    [selectedSourceId, sources],
  );

  const groups = useMemo(
    () => (selectedSource ? sourceGroupsState[selectedSource.id] ?? [] : workspaceData?.initialGroups ?? []),
    [selectedSource, sourceGroupsState, workspaceData?.initialGroups],
  );

  const allTasks = useMemo(() => groups.flatMap((group) => group.items as TaskItem[]), [groups]);
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) {
      return null;
    }

    return allTasks.find((task) => task.id === selectedTaskId)
      ?? (workspaceData?.initialTaskDetail?.id === selectedTaskId ? workspaceData.initialTaskDetail : null);
  }, [allTasks, selectedTaskId, workspaceData?.initialTaskDetail]);
  const smartSources = sources.filter((source) => source.kind === 'smart');
  const listSources = sources.filter((source) => source.kind === 'list');

  useEffect(() => {
    if (!selectedSource) {
      setSelectedTaskId(null);
      return;
    }

    const availableTasks = (sourceGroupsState[selectedSource.id] ?? []).flatMap((group) => group.items as TaskItem[]);
    if (availableTasks.some((task) => task.id === selectedTaskId)) {
      return;
    }

    const nextTask = availableTasks.find((task) => !task.completedAt) ?? availableTasks[0] ?? null;
    setSelectedTaskId(nextTask?.id ?? null);
  }, [selectedSource, selectedTaskId, sourceGroupsState]);

  function updateTaskInGroups(taskId: string, updater: (task: TaskItem) => TaskItem) {
    if (!selectedSource) {
      return;
    }

    setSourceGroupsState((current) => {
      const currentGroups = current[selectedSource.id] ?? [];
      const nextGroups = currentGroups.map((group) => ({
        ...group,
        items: group.items.map((item) => (item.id === taskId ? updater(item as TaskItem) : item)),
      }));

      const flattened = nextGroups.flatMap((group) => group.items as TaskItem[]);
      const targetTask = flattened.find((task) => task.id === taskId);
      if (!targetTask) {
        return current;
      }

      const filteredGroups = nextGroups.map((group) => ({
        ...group,
        items: group.items.filter((item) => item.id !== taskId),
      }));

      const targetGroupKey = targetTask.completedAt ? 'completed' : deriveGroupKey(targetTask);
      const targetGroup = filteredGroups.find((group) => group.key === targetGroupKey);
      if (targetGroup) {
        targetGroup.items = [...targetGroup.items, targetTask];
      }

      const orderedGroups = filteredGroups.map((group) => ({
        ...group,
        items: [...group.items],
      })).sort((a, b) => GROUP_ORDER.indexOf(a.key) - GROUP_ORDER.indexOf(b.key));

      return {
        ...current,
        [selectedSource.id]: orderedGroups,
      };
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Modal
        open={showCreateList}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateList(false);
            setHasSubmittedListCreate(false);
          }
        }}
        title="新建清单"
        description="先用最小字段把清单建起来。"
      >
        <CreateListForm
          action={(formData) => {
            setHasSubmittedListCreate(true);
            startTransition(() => {
              createListAction(formData);
            });
          }}
          error={createListState.error}
          onCancel={() => setShowCreateList(false)}
        />
      </Modal>

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
            key="task-form-create"
            onSubmitForm={(formData, isRecurring) => {
              setHasSubmittedCreate(true);
              startTransition(() => {
                if (isRecurring) {
                  createDefinitionAction(formData);
                  return;
                }

                createAction(formData);
              });
            }}
            error={createState.error || createDefinitionState.error}
            submitLabel="创建任务"
            keyResults={keyResults}
            listSources={listSources}
            selectedSource={selectedSource}
            onCancel={() => setTaskModal(null)}
          />
        )}
        {taskModal?.mode === 'edit' && (
          <TaskForm
            key={`task-form-edit-${taskModal.task.id}`}
            recurrenceEditable={false}
            onSubmitForm={(formData) => {
              setHasSubmittedUpdate(true);
              startTransition(() => {
                if (taskModal.task.definition) {
                  updateDefinitionAction(formData);
                  return;
                }

                updateAction(formData);
              });
            }}
            error={updateState.error || updateDefinitionState.error}
            submitLabel="更新任务"
            task={taskModal.task}
            keyResults={keyResults}
            listSources={listSources}
            selectedSource={selectedSource}
            onCancel={() => setTaskModal(null)}
          />
        )}
      </Modal>

      <div
        className={`grid min-h-0 flex-1 gap-px overflow-hidden rounded-[10px] border border-(--border-hairline) bg-(--border-hairline) ${
          selectedTask ? 'xl:grid-cols-[220px_minmax(0,1fr)_300px]' : 'xl:grid-cols-[220px_minmax(0,1fr)]'
        }`}
      >
        <section className="flex min-h-0 flex-col bg-(--bg-surface-1)">
          <div className="border-b app-shell-divider px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">Sources</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateList(true)}>
                新建
              </Button>
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto px-2 py-2.5">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">智能列表</p>
                </div>
                {smartSources.map((source) => {
                  const active = source.id === selectedSource?.id;
                  return (
                    <SourceButton
                      key={source.id}
                      source={source}
                      active={active}
                      onClick={() => {
                        setSelectedSourceId(source.id);
                        setSelectedTaskId(null);
                      }}
                    />
                  );
                })}
              </div>

              <div className="border-t app-shell-divider pt-2.5" />

              <div className="space-y-2">
                <div className="px-1">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">清单</p>
                </div>
                {listSources.length === 0 ? (
                  <div className="rounded-[10px] border border-dashed border-(--border-hairline) px-3 py-4 text-sm text-(--text-muted)">
                    还没有自定义清单。
                  </div>
                ) : listSources.map((source) => {
                  const active = source.id === selectedSource?.id;
                  return (
                    <SourceButton
                      key={source.id}
                      source={source}
                      active={active}
                      onClick={() => {
                        setSelectedSourceId(source.id);
                        setSelectedTaskId(null);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="min-h-0 bg-(--bg-surface-1)">
          <div className="dashboard-main-scroll flex h-full min-h-0 flex-col overflow-y-auto">
            <div className="sticky top-0 z-10 border-b app-shell-divider bg-[color:rgba(17,20,25,0.92)] px-3.5 py-2.5 backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">Task List</p>
                  <h2 className="mt-1 text-base font-semibold text-(--text-primary)">
                    {selectedSource?.title ?? '任务'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setTaskModal({ mode: 'create' });
                      setHasSubmittedCreate(false);
                    }}
                  >
                    新建任务
                  </Button>
                </div>
              </div>
              <div className="mt-2.5 rounded-[8px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] px-3 py-2 text-sm text-(--text-muted)">
                + 添加任务至「{selectedSource?.title ?? '收集箱'}」
              </div>
            </div>

            <div className="min-h-0 space-y-4 px-3 py-3">
              {groups.length === 0 ? (
                <Empty text="当前来源还没有任务。" />
              ) : (
                groups.map((group) => (
                  <div key={group.key} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-(--text-muted)">{group.title}</h3>
                      <span className="text-xs text-(--text-muted)">{group.items.length}</span>
                    </div>
                    {group.items.length === 0 ? (
                      <div className="rounded-[10px] border border-dashed border-(--border-hairline) px-4 py-5 text-sm text-(--text-muted)">
                        当前分组暂无任务。
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {(group.items as TaskItem[]).map((task) => {
                          const active = task.id === selectedTask?.id;
                          const completed = Boolean(task.completedAt);
                          return (
                            <article
                              key={task.id}
                              className={`rounded-[8px] border px-3 py-2.5 transition-colors ${
                                active
                                  ? 'border-(--border-glow) bg-[color:rgba(180,204,255,0.07)]'
                                  : 'border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)]'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  aria-label={completed ? '标记为未完成' : '标记为已完成'}
                                  onClick={() => {
                                    updateTaskInGroups(task.id, (currentTask) => ({
                                      ...currentTask,
                                      completedAt: completed ? null : new Date().toISOString(),
                                    }));

                                    startTransition(() => {
                                      void (async () => {
                                        await toggleTaskCompletionAction(task.id, !completed);
                                        router.refresh();
                                      })();
                                    });
                                  }}
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                    completed
                                      ? 'border-(--accent-ice) bg-[color:rgba(180,204,255,0.14)] text-(--accent-ice-strong)'
                                      : 'border-(--border-hairline) text-transparent'
                                  }`}
                                >
                                  <span className="text-[10px]">✓</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedTaskId(task.id)}
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <div className="flex items-center gap-3">
                                    <p className={`min-w-0 truncate text-sm font-medium ${completed ? 'text-(--text-muted) line-through' : 'text-(--text-primary)'}`}>
                                      {task.title}
                                    </p>
                                    {selectedSource?.kind === 'smart' && task.list?.name && (
                                      <Badge>{task.list.name}</Badge>
                                    )}
                                    {task.dueDate && <span className="text-xs text-(--text-muted)">截止 {task.dueDate}</span>}
                                    {completed && <span className="text-xs text-(--text-muted)">已完成</span>}
                                  </div>
                                </button>
                                <Button type="button" variant="ghost" size="sm" className="px-2" onClick={() => setTaskModal({ mode: 'edit', task })}>
                                  编辑
                                </Button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {selectedTask ? (
          <section className="min-h-0 bg-(--bg-surface-1)">
            <div className="dashboard-main-scroll flex h-full min-h-0 flex-col overflow-y-auto">
              <div className="sticky top-0 z-10 border-b app-shell-divider bg-[color:rgba(17,20,25,0.92)] px-3.5 py-2.5 backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">Task Detail</p>
                    <h2 className="mt-1 text-base font-semibold text-(--text-primary)">详情</h2>
                  </div>
                </div>
              </div>
              <div className="min-h-0 flex-1 px-3 py-3">
                <div className="space-y-4">
                  <div>
                    <p className="text-xl font-semibold text-(--text-primary)">{selectedTask.title}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-(--text-muted)">
                      {selectedTask.list?.name && <span>清单 {selectedTask.list.name}</span>}
                      {selectedTask.dueDate && <span>截止 {selectedTask.dueDate}</span>}
                    </div>
                  </div>
                  <div className="rounded-[10px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">描述</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-(--text-secondary)">
                      {selectedTask.description || selectedTask.notes || '暂无描述。'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function TaskForm({
  onSubmitForm,
  error,
  submitLabel,
  task,
  keyResults,
  listSources,
  selectedSource,
  recurrenceEditable = true,
  onCancel,
}: {
  onSubmitForm: (formData: FormData, isRecurring: boolean) => void;
  error: string;
  submitLabel: string;
  task?: TaskItem;
  keyResults: KeyResultOption[];
  listSources: TaskSourceSummary[];
  selectedSource: TaskSourceSummary | null;
  recurrenceEditable?: boolean;
  onCancel: () => void;
}) {
  const today = formatDateOnly(new Date());
  const tomorrow = formatDateOnly(addDays(new Date(), 1));
  const nextWeek = formatDateOnly(addDays(new Date(), 7));
  const listOptions = listSources.map((source) => ({
    value: source.listId ?? '',
    label: source.title,
  })).filter((option) => option.value);
  const frequencyOptions = [
    { value: 'daily', label: '每天' },
    { value: 'weekly', label: '每周' },
    { value: 'monthly', label: '每月' },
    { value: 'weekdays', label: '工作日' },
    { value: 'weekends', label: '周末' },
  ];
  const endTypeOptions = [
    { value: 'never', label: '一直重复' },
    { value: 'until_date', label: '按结束日期' },
    { value: 'after_count', label: '按重复次数' },
  ];
  const keyResultOptions = keyResults.map((keyResult) => ({
    value: keyResult.id,
    label: `${keyResult.objectiveTitle} / ${keyResult.title}`,
  }));
  const defaultListId = task?.listId
    ?? (selectedSource?.kind === 'list' ? selectedSource.listId ?? '' : '')
    ?? listOptions[0]?.value
    ?? '';
  const defaultDueDate = task?.dueDate
    ?? (selectedSource?.id === 'today' ? today : selectedSource?.id === 'tomorrow' ? tomorrow : '')
    ?? '';
  const form = useForm({
    defaultValues: getTaskFormValues(task, defaultListId, defaultDueDate),
    onSubmit: async ({ value }) => {
      onSubmitForm(buildTaskFormData(value), value.isRecurring);
    },
  });

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      {error && <ErrorAlert message={error} />}

      <div className="space-y-4">
        <form.Field
          name="title"
          validators={{
            onChange: ({ value }) => (value.trim() ? undefined : '标题不能为空'),
          }}
        >
          {(field) => (
            <TextField
              name={field.name}
              label="标题"
              required
              autoFocus
              value={field.state.value}
              error={getFieldError(field)}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          )}
        </form.Field>
        <form.Field name="listId">
          {(field) => (
            <SelectField
              name={field.name}
              label="归属清单"
              value={field.state.value}
              options={listOptions}
              error={getFieldError(field)}
              onValueChange={field.handleChange}
            />
          )}
        </form.Field>
        <form.Field name="dueDate">
          {(field) => (
            <div className="rounded-[10px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-4">
              <div className="mb-3">
                <p className="text-sm text-(--text-secondary)">日期</p>
                <p className="mt-1 text-xs text-(--text-muted)">先选常用日期，特殊时间再展开日历。</p>
              </div>
              <div className="mb-4 grid gap-2 sm:grid-cols-3">
                <QuickDateButton label="今日" active={field.state.value === today} onClick={() => field.handleChange(today)} />
                <QuickDateButton label="明日" active={field.state.value === tomorrow} onClick={() => field.handleChange(tomorrow)} />
                <QuickDateButton label="下周" active={field.state.value === nextWeek} onClick={() => field.handleChange(nextWeek)} />
              </div>
              <div className="border-t app-shell-divider pt-4">
                <DatePickerField
                  name={field.name}
                  label="选择日期"
                  value={field.state.value}
                  error={getFieldError(field)}
                  allowClear={false}
                  onValueChange={field.handleChange}
                />
              </div>
            </div>
          )}
        </form.Field>
      </div>

      <form.Field name="description">
        {(field) => (
          <TextareaField
            name={field.name}
            label="描述"
            rows={5}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>

      <div className="space-y-4 rounded-[10px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-4">
        <form.Field name="isRecurring">
          {(field) => (
            <CheckboxField
              name={field.name}
              label="重复"
              checked={field.state.value}
              disabled={!recurrenceEditable}
              description={recurrenceEditable
                ? '启用后保存为重复定义，并确保今天应出现的实例可见。'
                : '编辑时暂不支持普通任务与重复任务之间互转。'}
              onCheckedChange={field.handleChange}
            />
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.isRecurring}>
          {(isRecurring) => isRecurring ? (
            <div className="grid gap-4 md:grid-cols-2">
              <form.Field name="frequency">
                {(field) => (
                  <SelectField
                    name={field.name}
                    label="频率"
                    value={field.state.value}
                    options={frequencyOptions}
                    onValueChange={field.handleChange}
                  />
                )}
              </form.Field>
              <form.Field name="endType">
                {(field) => (
                  <SelectField
                    name={field.name}
                    label="结束方式"
                    value={field.state.value}
                    options={endTypeOptions}
                    onValueChange={field.handleChange}
                  />
                )}
              </form.Field>

              <form.Subscribe selector={(state) => state.values.endType}>
                {(endType) => (
                  <>
                    {endType === 'until_date' && (
                      <form.Field name="endDate">
                        {(field) => (
                          <DatePickerField
                            name={field.name}
                            label="结束日期"
                            value={field.state.value}
                            onValueChange={field.handleChange}
                          />
                        )}
                      </form.Field>
                    )}
                    {endType === 'after_count' && (
                      <form.Field name="occurrenceCount">
                        {(field) => (
                          <TextField
                            name={field.name}
                            label="重复次数"
                            inputMode="numeric"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                          />
                        )}
                      </form.Field>
                    )}
                  </>
                )}
              </form.Subscribe>
            </div>
          ) : null}
        </form.Subscribe>
      </div>

      <form.Field name="keyResultIds">
        {(field) => (
          <SelectField
            name={field.name}
            label="关联关键结果"
            description="把执行动作绑到 KR，后续 dashboard 与 review 才能复用这条上下文。"
            multiple
            size={3}
            value={field.state.value.join(',')}
            options={keyResultOptions}
            onValueChange={(value) => field.handleChange(value ? value.split(',').filter(Boolean) : [])}
          />
        )}
      </form.Field>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <form.Subscribe selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}>
          {(state) => (
            <div className="flex items-center gap-3">
              <ActionStatus pending={state.isSubmitting} idleLabel="准备提交" pendingLabel="提交中" />
              <Button type="submit" variant="primary" disabled={!state.canSubmit || state.isSubmitting}>
                {submitLabel}
              </Button>
            </div>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}

function QuickDateButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'primary' : 'secondary'}
      size="sm"
      className={active ? '' : 'bg-transparent'}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function SourceButton({
  source,
  active,
  onClick,
}: {
  source: TaskSourceSummary;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-[10px] border px-3 py-2.5 text-left transition-colors ${
        active
          ? 'border-(--border-glow) bg-[color:rgba(180,204,255,0.08)] text-(--text-primary)'
          : 'border-transparent text-(--text-secondary) hover:border-(--border-hairline) hover:bg-[color:rgba(255,255,255,0.04)] hover:text-(--text-primary)'
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-(--border-hairline) text-[11px] uppercase text-(--text-muted)">
          {source.icon.slice(0, 2)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{source.title}</span>
          <span className="block text-[11px] uppercase tracking-[0.18em] text-(--text-muted)">
            {source.kind === 'smart' ? '智能列表' : '清单'}
          </span>
        </span>
      </span>
      <span className="text-sm font-medium text-(--text-primary)">{source.count}</span>
    </button>
  );
}

function CreateListForm({
  action,
  error,
  onCancel,
}: {
  action: (formData: FormData) => void;
  error: string;
  onCancel: () => void;
}) {
  const form = useForm({
    defaultValues: {
      name: '',
      icon: '',
    },
    onSubmit: async ({ value }) => {
      const formData = new FormData();
      formData.set('name', value.name);
      formData.set('icon', value.icon);
      action(formData);
    },
  });

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      {error && <ErrorAlert message={error} />}
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) => (value.trim() ? undefined : '清单名称不能为空'),
        }}
      >
        {(field) => (
          <TextField
            name={field.name}
            label="名称"
            required
            autoFocus
            value={field.state.value}
            error={getFieldError(field)}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
      <form.Field name="icon">
        {(field) => (
          <TextField
            name={field.name}
            label="图标"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <form.Subscribe selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}>
          {(state) => (
            <div className="flex items-center gap-3">
              <ActionStatus pending={state.isSubmitting} idleLabel="准备提交" pendingLabel="提交中" />
              <Button type="submit" variant="primary" disabled={!state.canSubmit || state.isSubmitting}>
                创建清单
              </Button>
            </div>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
