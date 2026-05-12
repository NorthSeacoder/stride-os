'use client';

import { Popover } from '@base-ui/react/popover';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useMemo, useState, useTransition, type CSSProperties } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  Button,
  DatePickerField,
  Empty,
  ErrorAlert,
  FeedbackAlert,
  Modal,
  SelectField,
  TextareaField,
  TextField,
} from '@/components/ui';
import type { TaskActionState } from '@/app/(dashboard)/tasks/actions';
import { createTaskAction, updateTaskAction } from '@/app/(dashboard)/tasks/actions';
import { buildTaskFormData, getTaskFormValues, type TaskFormValues } from '@/app/(dashboard)/tasks/task-form-bridge';
import {
  moveTaskToQuadrantAction,
  moveTaskToQuadrantListAction,
  toggleQuadrantTaskCompletionAction,
} from './actions';

type QuadrantKey = 'Q1' | 'Q2' | 'Q3' | 'Q4';

type TaskItem = {
  id: string;
  title: string;
  notes: string | null;
  description?: string | null;
  status: string;
  dueDate: string | null;
  priority?: string | null;
  completedAt?: Date | string | null;
  listId?: string | null;
  list?: {
    id?: string;
    name?: string;
    icon?: string | null;
  } | null;
  keyResultLinks?: Array<{
    keyResult: {
      id: string;
      title: string;
    };
  }>;
};

type QuadrantGroup = {
  listId: string;
  listName: string;
  listIcon: string | null;
  items: TaskItem[];
};

type QuadrantSection = {
  key: QuadrantKey;
  title: string;
  groups: QuadrantGroup[];
  completedGroups: QuadrantGroup[];
  totalCount: number;
  openCount: number;
  completedCount: number;
};

type QuadrantBoard = {
  today: string;
  quadrants: QuadrantSection[];
};

type TaskListOption = {
  id: string;
  name: string;
  icon: string | null;
};

type TaskModalState =
  | { mode: 'create'; quadrant: QuadrantKey }
  | { mode: 'edit'; task: TaskItem }
  | null;

const initialActionState: TaskActionState = { error: '' };

const QUADRANT_ORDER: QuadrantKey[] = ['Q1', 'Q2', 'Q3', 'Q4'];
const QUADRANT_LAYOUT: QuadrantKey[] = ['Q1', 'Q2', 'Q3', 'Q4'];
const QUADRANT_ACCENTS: Record<QuadrantKey, string> = {
  Q1: 'text-rose-300',
  Q2: 'text-amber-300',
  Q3: 'text-sky-300',
  Q4: 'text-emerald-300',
};
const PRIORITY_OPTIONS = [
  { value: '', label: '无优先级' },
  { value: 'P1', label: 'P1' },
  { value: 'P2', label: 'P2' },
  { value: 'P3', label: 'P3' },
];

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date | string, days: number) {
  const source = typeof base === 'string' ? parseDateOnly(base) : new Date(base);
  const next = new Date(source);
  next.setDate(next.getDate() + days);
  return next;
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
}

function getCalendarDayDelta(dueDate: string | null | undefined, today: string) {
  if (!dueDate) return null;
  const due = parseDateOnly(dueDate);
  const current = parseDateOnly(today);
  return Math.round((due.getTime() - current.getTime()) / (24 * 60 * 60 * 1000));
}

function getTaskQuadrant(task: Pick<TaskItem, 'priority' | 'dueDate'>, today: string): QuadrantKey {
  if (!task.dueDate) {
    if (task.priority === 'P1') return 'Q1';
    if (task.priority === 'P2') return 'Q2';
    if (task.priority === 'P3') return 'Q3';
    return 'Q4';
  }

  const delta = getCalendarDayDelta(task.dueDate, today);
  const urgency = delta !== null && delta <= 7 ? 'high' : 'low';
  const importance = task.priority === 'P1' || task.priority === 'P2' ? 'high' : 'low';

  if (importance === 'high' && urgency === 'high') return 'Q1';
  if (importance === 'high' && urgency === 'low') return 'Q2';
  if (importance === 'low' && urgency === 'high') return 'Q3';
  return 'Q4';
}

function getQuadrantDefaults(quadrant: QuadrantKey, today: string) {
  const lowUrgencyDate = formatDateOnly(addDays(today, 8));
  if (quadrant === 'Q1') return { priority: 'P1', dueDate: today };
  if (quadrant === 'Q2') return { priority: 'P2', dueDate: lowUrgencyDate };
  if (quadrant === 'Q3') return { priority: 'P3', dueDate: today };
  return { priority: '', dueDate: lowUrgencyDate };
}

function isCompleted(task: Pick<TaskItem, 'completedAt' | 'status'>) {
  return Boolean(task.completedAt) || task.status === 'done';
}

function getTaskListInfo(task: TaskItem) {
  if (task.list?.id && task.list?.name) {
    return {
      listId: task.list.id,
      listName: task.list.name,
      listIcon: task.list.icon ?? null,
    };
  }

  return {
    listId: task.listId ?? 'unassigned',
    listName: '未分组',
    listIcon: null,
  };
}

function extractItems(board: QuadrantBoard) {
  const seen = new Set<string>();
  const items: TaskItem[] = [];

  for (const quadrant of board.quadrants) {
    for (const group of [...quadrant.groups, ...quadrant.completedGroups]) {
      for (const item of group.items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        items.push(item);
      }
    }
  }

  return items;
}

function buildGroups(items: TaskItem[]) {
  const groups = new Map<string, QuadrantGroup>();

  for (const item of items) {
    const listInfo = getTaskListInfo(item);
    const current = groups.get(listInfo.listId);
    if (current) {
      current.items.push(item);
      continue;
    }

    groups.set(listInfo.listId, {
      ...listInfo,
      items: [item],
    });
  }

  return Array.from(groups.values()).sort((a, b) => a.listName.localeCompare(b.listName, 'zh-CN'));
}

function buildQuadrantSections(
  items: TaskItem[],
  lists: TaskListOption[],
  today: string,
  showCompleted: boolean,
  activeTask: TaskItem | null,
) {
  const quadrantMap = new Map<QuadrantKey, { open: TaskItem[]; completed: TaskItem[] }>();
  for (const quadrant of QUADRANT_ORDER) {
    quadrantMap.set(quadrant, { open: [], completed: [] });
  }

  for (const item of items) {
    const quadrant = getTaskQuadrant(item, today);
    const bucket = quadrantMap.get(quadrant);
    if (!bucket) continue;
    if (isCompleted(item)) {
      bucket.completed.push(item);
    } else {
      bucket.open.push(item);
    }
  }

  return QUADRANT_ORDER.map((quadrant) => {
    const bucket = quadrantMap.get(quadrant)!;
    let groups = buildGroups(bucket.open);

    if (activeTask && getTaskQuadrant(activeTask, today) === quadrant) {
      const existingIds = new Set(groups.map((group) => group.listId));
      const extraGroups = lists
        .filter((list) => !existingIds.has(list.id))
        .map((list) => ({
          listId: list.id,
          listName: list.name,
          listIcon: list.icon,
          items: [],
        }));
      groups = [...groups, ...extraGroups];
    }

    return {
      key: quadrant,
      title: boardTitle(quadrant),
      groups,
      completedGroups: showCompleted ? buildGroups(bucket.completed) : [],
      totalCount: bucket.open.length + bucket.completed.length,
      openCount: bucket.open.length,
      completedCount: bucket.completed.length,
    };
  });
}

function boardTitle(quadrant: QuadrantKey) {
  if (quadrant === 'Q1') return '重要且紧急';
  if (quadrant === 'Q2') return '重要不紧急';
  if (quadrant === 'Q3') return '不重要但紧急';
  return '不重要不紧急';
}

function formatTaskDateLabel(dueDate: string | null, today: string) {
  if (!dueDate) return '无日期';
  const delta = getCalendarDayDelta(dueDate, today);
  if (delta === 0) return '今天';
  if (delta === 1) return '明天';
  if (delta === -1) return '昨天';
  if (delta !== null && delta < 0) return `逾期 ${Math.abs(delta)} 天`;
  return dueDate;
}

function getListName(listId: string | null | undefined, lists: TaskListOption[]) {
  if (!listId) return '';
  return lists.find((list) => list.id === listId)?.name ?? '';
}

function isQuadrantDropId(value: string | undefined): value is `quadrant:${QuadrantKey}` {
  return Boolean(value && value.startsWith('quadrant:'));
}

function isListDropId(value: string | undefined): value is `list:${QuadrantKey}:${string}` {
  return Boolean(value && value.startsWith('list:'));
}

function parseQuadrantDropId(value: `quadrant:${QuadrantKey}`) {
  return value.replace('quadrant:', '') as QuadrantKey;
}

function parseListDropId(value: `list:${QuadrantKey}:${string}`) {
  const [, quadrant, ...rest] = value.split(':');
  return {
    quadrant: quadrant as QuadrantKey,
    listId: rest.join(':'),
  };
}

function normalizeDropListId(listId: string) {
  return listId === 'unassigned' ? null : listId;
}

export function QuadrantsClient({
  board,
  lists,
}: {
  board: QuadrantBoard;
  lists: TaskListOption[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<TaskItem[]>(() => extractItems(board));
  const [showCompleted, setShowCompleted] = useState(false);
  const [error, setError] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [taskModal, setTaskModal] = useState<TaskModalState>(null);
  const [hasSubmittedCreate, setHasSubmittedCreate] = useState(false);
  const [hasSubmittedUpdate, setHasSubmittedUpdate] = useState(false);
  const [createState, createAction, createPending] = useActionState(createTaskAction, initialActionState);
  const [updateState, updateAction, updatePending] = useActionState(updateTaskAction, initialActionState);
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    setItems(extractItems(board));
  }, [board]);

  useEffect(() => {
    if (hasSubmittedCreate && !createPending && !createState.error) {
      setTaskModal(null);
      setHasSubmittedCreate(false);
      router.refresh();
    }
  }, [createPending, createState.error, hasSubmittedCreate, router]);

  useEffect(() => {
    if (hasSubmittedUpdate && !updatePending && !updateState.error) {
      setTaskModal(null);
      setHasSubmittedUpdate(false);
      router.refresh();
    }
  }, [hasSubmittedUpdate, router, updatePending, updateState.error]);

  const activeTask = items.find((item) => item.id === activeTaskId) ?? null;
  const sections = useMemo(
    () => buildQuadrantSections(items, lists, board.today, showCompleted, activeTask),
    [activeTask, board.today, items, lists, showCompleted],
  );

  function toggleGroup(key: string) {
    setCollapsedGroups((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function updateItem(taskId: string, updater: (task: TaskItem) => TaskItem) {
    setItems((current) => current.map((task) => (task.id === taskId ? updater(task) : task)));
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const draggedTask = items.find((item) => item.id === String(event.active.id));
    const targetId = event.over?.id ? String(event.over.id) : undefined;
    setActiveTaskId(null);

    if (!draggedTask || !targetId) {
      return;
    }

    const currentQuadrant = getTaskQuadrant(draggedTask, board.today);
    setError('');

    if (isListDropId(targetId)) {
      const { quadrant, listId } = parseListDropId(targetId);
      const normalizedListId = normalizeDropListId(listId);
      if (quadrant === currentQuadrant && normalizedListId !== (draggedTask.listId ?? null)) {
        const previousListId = draggedTask.listId ?? null;
        updateItem(draggedTask.id, (task) => ({
          ...task,
          listId: normalizedListId,
          list: normalizedListId
            ? {
                id: normalizedListId,
                name: getListName(normalizedListId, lists),
                icon: lists.find((list) => list.id === normalizedListId)?.icon ?? null,
              }
            : null,
        }));

        startTransition(async () => {
          const result = await moveTaskToQuadrantListAction(draggedTask.id, normalizedListId);
          if (result.error) {
            updateItem(draggedTask.id, (task) => ({
              ...task,
              listId: previousListId,
              list: previousListId ? { id: previousListId, name: getListName(previousListId, lists), icon: lists.find((list) => list.id === previousListId)?.icon ?? null } : null,
            }));
            setError(result.error);
          }
        });
        return;
      }

      if (quadrant !== currentQuadrant) {
        const previous = { priority: draggedTask.priority ?? '', dueDate: draggedTask.dueDate ?? '' };
        const defaults = getQuadrantDefaults(quadrant, board.today);
        updateItem(draggedTask.id, (task) => ({
          ...task,
          priority: defaults.priority || null,
          dueDate: defaults.dueDate,
        }));

        startTransition(async () => {
          const result = await moveTaskToQuadrantAction(draggedTask.id, quadrant);
          if (result.error) {
            updateItem(draggedTask.id, (task) => ({
              ...task,
              priority: previous.priority || null,
              dueDate: previous.dueDate || null,
            }));
            setError(result.error);
          }
        });
      }

      return;
    }

    if (isQuadrantDropId(targetId)) {
      const quadrant = parseQuadrantDropId(targetId);
      if (quadrant === currentQuadrant) {
        return;
      }

      const previous = { priority: draggedTask.priority ?? '', dueDate: draggedTask.dueDate ?? '' };
      const defaults = getQuadrantDefaults(quadrant, board.today);
      updateItem(draggedTask.id, (task) => ({
        ...task,
        priority: defaults.priority || null,
        dueDate: defaults.dueDate,
      }));

      startTransition(async () => {
        const result = await moveTaskToQuadrantAction(draggedTask.id, quadrant);
        if (result.error) {
          updateItem(draggedTask.id, (task) => ({
            ...task,
            priority: previous.priority || null,
            dueDate: previous.dueDate || null,
          }));
          setError(result.error);
        }
      });
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-(--text-primary)">四象限</h1>
        <Popover.Root>
          <Popover.Trigger
            render={
              <Button type="button" variant="ghost" size="sm" className="h-8 min-h-8 rounded-[6px] px-2.5 text-sm">
                ...
              </Button>
            }
          />
          <Popover.Portal>
            <Popover.Positioner className="z-50">
              <Popover.Popup className="metal-frame rounded-[10px] border border-(--border-hairline) bg-(--bg-surface-2) p-3 shadow-xl">
                <label className="flex cursor-pointer items-center gap-3 text-sm text-(--text-secondary)">
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(event) => setShowCompleted(event.target.checked)}
                  />
                  <span>显示已完成</span>
                </label>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>

      {error && <FeedbackAlert tone="error" message={error} />}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTaskId(null)}
      >
        <div className="grid min-h-0 flex-1 auto-rows-fr gap-2 lg:grid-cols-2 lg:grid-rows-2">
          {QUADRANT_LAYOUT.map((quadrant) => {
            const section = sections.find((item) => item.key === quadrant)!;
            return (
              <QuadrantCell
                key={quadrant}
                section={section}
                today={board.today}
                activeTask={activeTask}
                collapsedGroups={collapsedGroups}
                showCompleted={showCompleted}
                onToggleGroup={toggleGroup}
                onToggleCompletion={(task, completed) => {
                  const previousCompletedAt = task.completedAt ?? null;
                  updateItem(task.id, (current) => ({
                    ...current,
                    status: completed ? 'done' : 'inbox',
                    completedAt: completed ? new Date().toISOString() : null,
                  }));

                  startTransition(async () => {
                    const result = await toggleQuadrantTaskCompletionAction(task.id, completed);
                    if (result.error) {
                      updateItem(task.id, (current) => ({
                        ...current,
                        status: previousCompletedAt ? 'done' : 'inbox',
                        completedAt: previousCompletedAt,
                      }));
                      setError(result.error);
                    }
                  });
                }}
                onCreate={() => setTaskModal({ mode: 'create', quadrant })}
                onEdit={(task) => setTaskModal({ mode: 'edit', task })}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? <TaskRow task={activeTask} today={board.today} dragging /> : null}
        </DragOverlay>
      </DndContext>

      <QuadrantTaskModal
        lists={lists}
        today={board.today}
        state={taskModal}
        createState={createState}
        updateState={updateState}
        createPending={createPending}
        updatePending={updatePending}
        onClose={() => {
          setTaskModal(null);
          setHasSubmittedCreate(false);
          setHasSubmittedUpdate(false);
        }}
        onCreateSubmit={(values) => {
          setHasSubmittedCreate(true);
          startTransition(() => {
            createAction(buildTaskFormData(values));
          });
        }}
        onUpdateSubmit={(values) => {
          setHasSubmittedUpdate(true);
          startTransition(() => {
            updateAction(buildTaskFormData(values));
          });
        }}
      />
    </div>
  );
}

function QuadrantCell({
  section,
  today,
  activeTask,
  collapsedGroups,
  showCompleted,
  onToggleGroup,
  onToggleCompletion,
  onCreate,
  onEdit,
}: {
  section: QuadrantSection;
  today: string;
  activeTask: TaskItem | null;
  collapsedGroups: Record<string, boolean>;
  showCompleted: boolean;
  onToggleGroup: (key: string) => void;
  onToggleCompletion: (task: TaskItem, completed: boolean) => void;
  onCreate: () => void;
  onEdit: (task: TaskItem) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `quadrant:${section.key}` });
  const showGroupDropTargets = activeTask ? getTaskQuadrant(activeTask, today) === section.key : false;

  return (
    <section
      ref={setNodeRef}
      className={`min-h-0 h-full rounded-[10px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] shadow-[0_14px_40px_rgba(3,8,18,0.12)] ${
        isOver ? 'border-(--border-glow) bg-[linear-gradient(180deg,rgba(180,204,255,0.12),rgba(180,204,255,0.05))]' : 'border-(--border-hairline)'
      }`}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between gap-2 border-b app-shell-divider px-3 py-2">
          <div className="flex items-center gap-3">
            <span className={`text-[11px] font-semibold tracking-[0.16em] ${QUADRANT_ACCENTS[section.key]}`}>{romanLabel(section.key)}</span>
            <div>
              <h2 className={`text-[14px] font-semibold tracking-[-0.02em] ${QUADRANT_ACCENTS[section.key]}`}>{section.title}</h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-(--text-muted)">{section.openCount}</span>
            <Button type="button" variant="ghost" size="sm" className="h-8 min-h-8 rounded-[6px] px-2 text-sm" onClick={onCreate}>
              ＋
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2.5">
          {section.openCount === 0 && (!showCompleted || section.completedCount === 0) ? (
            <div className="flex h-full min-h-[180px] items-center justify-center">
              <Empty text="没有任务" />
            </div>
          ) : (
            <div className="space-y-2">
              {section.groups
                .filter((group) => showGroupDropTargets || group.items.length > 0)
                .map((group) => (
                  <ListGroup
                    key={`open:${section.key}:${group.listId}`}
                    group={group}
                    dropId={`list:${section.key}:${group.listId}`}
                    today={today}
                    collapsed={Boolean(collapsedGroups[`open:${section.key}:${group.listId}`])}
                    onToggle={() => onToggleGroup(`open:${section.key}:${group.listId}`)}
                    onToggleCompletion={onToggleCompletion}
                    onEdit={onEdit}
                    showEmptyDropZone={showGroupDropTargets && group.items.length === 0}
                  />
                ))}

              {showCompleted && section.completedGroups.length > 0 ? (
                <div className="space-y-2 border-t app-shell-divider pt-2.5">
                  <p className="text-xs uppercase tracking-[0.18em] text-(--text-muted)">已完成</p>
                  {section.completedGroups.map((group) => (
                    <ListGroup
                      key={`done:${section.key}:${group.listId}`}
                      group={group}
                      dropId={`completed:${section.key}:${group.listId}`}
                      today={today}
                      collapsed={Boolean(collapsedGroups[`done:${section.key}:${group.listId}`])}
                      onToggle={() => onToggleGroup(`done:${section.key}:${group.listId}`)}
                      onToggleCompletion={onToggleCompletion}
                      onEdit={onEdit}
                      droppable={false}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ListGroup({
  group,
  dropId,
  today,
  collapsed,
  onToggle,
  onToggleCompletion,
  onEdit,
  showEmptyDropZone = false,
  droppable = true,
}: {
  group: QuadrantGroup;
  dropId: string;
  today: string;
  collapsed: boolean;
  onToggle: () => void;
  onToggleCompletion: (task: TaskItem, completed: boolean) => void;
  onEdit: (task: TaskItem) => void;
  showEmptyDropZone?: boolean;
  droppable?: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: dropId, disabled: droppable === false });

  return (
    <div
      ref={setNodeRef}
      className={droppable !== false && isOver ? 'rounded-[6px] bg-[color:rgba(180,204,255,0.06)]' : 'rounded-[6px]'}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-1 py-1.5 text-left"
      >
        <span className="flex items-center gap-2 text-[13px] font-medium text-(--text-primary)">
          <span className="text-(--text-muted)">{collapsed ? '▸' : '▾'}</span>
          <span>{group.listIcon ? `${group.listIcon} ` : ''}{group.listName}</span>
          <span className="text-(--text-muted)">{group.items.length}</span>
        </span>
      </button>

      {!collapsed ? (
        group.items.length > 0 ? (
          <div className="space-y-1 px-0 pb-1">
            {group.items.map((task) => (
              <DraggableTaskRow
                key={task.id}
                task={task}
                today={today}
                onToggleCompletion={onToggleCompletion}
                onEdit={onEdit}
              />
            ))}
          </div>
        ) : showEmptyDropZone ? (
          <div className="px-1 pb-2">
            <div className="rounded-[6px] border border-dashed border-(--border-hairline) px-3 py-4 text-center text-sm text-(--text-muted)">
              拖到这里以移动到该清单
            </div>
          </div>
        ) : null
      ) : null}
    </div>
  );
}

function DraggableTaskRow({
  task,
  today,
  onToggleCompletion,
  onEdit,
}: {
  task: TaskItem;
  today: string;
  onToggleCompletion: (task: TaskItem, completed: boolean) => void;
  onEdit: (task: TaskItem) => void;
}) {
  const [dragReady, setDragReady] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform
    ? ({ transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } as CSSProperties)
    : undefined;

  useEffect(() => {
    setDragReady(true);
  }, []);

  return (
    <div ref={setNodeRef}>
      <TaskRow
        task={task}
        today={today}
        dragging={isDragging}
        dragAttributes={dragReady ? attributes : undefined}
        dragListeners={dragReady ? listeners : undefined}
        style={dragReady ? style : undefined}
        onToggleCompletion={onToggleCompletion}
        onEdit={onEdit}
      />
    </div>
  );
}

function TaskRow({
  task,
  today,
  dragging = false,
  dragAttributes,
  dragListeners,
  style,
  onToggleCompletion,
  onEdit,
}: {
  task: TaskItem;
  today: string;
  dragging?: boolean;
  dragAttributes?: object;
  dragListeners?: object;
  style?: CSSProperties;
  onToggleCompletion?: (task: TaskItem, completed: boolean) => void;
  onEdit?: (task: TaskItem) => void;
}) {
  const completed = isCompleted(task);
  const delta = getCalendarDayDelta(task.dueDate, today);

  return (
    <article
      style={style}
      {...dragAttributes}
      {...dragListeners}
      className={`rounded-[6px] border px-3 py-2.5 transition ${
        dragging
          ? 'border-(--border-glow) bg-[color:rgba(180,204,255,0.08)] opacity-80 shadow-lg'
          : 'border-transparent hover:border-(--border-hairline) hover:bg-[color:rgba(255,255,255,0.03)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label={completed ? '标记为未完成' : '标记为已完成'}
          onClick={(event) => {
            event.stopPropagation();
            onToggleCompletion?.(task, !completed);
          }}
          className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-[3px] border text-[9px] ${
            completed
              ? 'border-(--border-glow) bg-[color:rgba(180,204,255,0.14)] text-(--text-primary)'
              : 'border-(--border-hairline) text-transparent'
          }`}
        >
          ✓
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit?.(task);
          }}
          className="min-w-0 flex-1 text-left"
        >
          <p className={`truncate text-[13px] font-medium ${completed ? 'text-(--text-muted) line-through' : 'text-(--text-primary)'}`}>
            {task.title}
          </p>
        </button>

        <div className="flex shrink-0 items-center gap-2 text-[11px] text-(--text-muted)">
          <span className="max-w-[7rem] truncate">{task.list?.name ?? ''}</span>
          <span className={delta !== null && delta < 0 ? 'text-rose-300' : delta === 0 ? 'text-amber-300' : ''}>
            {formatTaskDateLabel(task.dueDate, today)}
          </span>
        </div>
      </div>
    </article>
  );
}

function QuadrantTaskModal({
  state,
  lists,
  today,
  createState,
  updateState,
  createPending,
  updatePending,
  onClose,
  onCreateSubmit,
  onUpdateSubmit,
}: {
  state: TaskModalState;
  lists: TaskListOption[];
  today: string;
  createState: TaskActionState;
  updateState: TaskActionState;
  createPending: boolean;
  updatePending: boolean;
  onClose: () => void;
  onCreateSubmit: (values: TaskFormValues) => void;
  onUpdateSubmit: (values: TaskFormValues) => void;
}) {
  const defaultListId = lists[0]?.id ?? '';
  const [values, setValues] = useState<TaskFormValues>(() => getTaskFormValues(undefined, defaultListId, today, 'P1'));

  useEffect(() => {
    if (!state) {
      return;
    }

    if (state.mode === 'create') {
      const defaults = getQuadrantDefaults(state.quadrant, today);
      setValues(getTaskFormValues(undefined, defaultListId, defaults.dueDate, defaults.priority));
      return;
    }

    setValues(getTaskFormValues(state.task, state.task.listId ?? defaultListId, state.task.dueDate, state.task.priority ?? ''));
  }, [defaultListId, state, today]);

  const activeState = state?.mode === 'edit' ? updateState : createState;
  const pending = state?.mode === 'edit' ? updatePending : createPending;
  const tomorrow = formatDateOnly(addDays(today, 1));
  const nextWeek = formatDateOnly(addDays(today, 7));

  return (
    <Modal
      open={state !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={state?.mode === 'edit' ? '编辑任务' : '新建任务'}
    >
      {state ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (state.mode === 'edit') {
              onUpdateSubmit(values);
              return;
            }
            onCreateSubmit(values);
          }}
        >
          {activeState.error ? <ErrorAlert message={activeState.error} /> : null}

          <TextField
            name="title"
            label="标题"
            required
            autoFocus
            value={values.title}
            onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
          />

          <SelectField
            name="listId"
            label="归属清单"
            value={values.listId}
            options={lists.map((list) => ({ value: list.id, label: list.name }))}
            onValueChange={(value) => setValues((current) => ({ ...current, listId: value }))}
          />

          <SelectField
            name="priority"
            label="优先级"
            value={values.priority}
            options={PRIORITY_OPTIONS}
            onValueChange={(value) => setValues((current) => ({ ...current, priority: value }))}
          />

          <div className="rounded-[10px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-3.5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Button type="button" variant={values.dueDate === today ? 'primary' : 'secondary'} size="sm" onClick={() => setValues((current) => ({ ...current, dueDate: today }))}>
                今日
              </Button>
              <Button type="button" variant={values.dueDate === tomorrow ? 'primary' : 'secondary'} size="sm" onClick={() => setValues((current) => ({ ...current, dueDate: tomorrow }))}>
                明日
              </Button>
              <Button type="button" variant={values.dueDate === nextWeek ? 'primary' : 'secondary'} size="sm" onClick={() => setValues((current) => ({ ...current, dueDate: nextWeek }))}>
                下周
              </Button>
            </div>

            <DatePickerField
              name="dueDate"
              label="截止日期"
              value={values.dueDate}
              allowClear={false}
              onValueChange={(value) => setValues((current) => ({ ...current, dueDate: value }))}
            />
          </div>

          <TextareaField
            name="description"
            label="描述"
            rows={5}
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" variant="primary" disabled={!values.title.trim() || pending}>
              {pending ? '提交中' : state.mode === 'edit' ? '更新任务' : '创建任务'}
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}

function romanLabel(quadrant: QuadrantKey) {
  if (quadrant === 'Q1') return 'I';
  if (quadrant === 'Q2') return 'II';
  if (quadrant === 'Q3') return 'III';
  return 'IV';
}
