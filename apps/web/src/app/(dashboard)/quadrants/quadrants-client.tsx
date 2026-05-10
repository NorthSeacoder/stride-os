'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, Ref } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Button, Empty, FeedbackAlert, SelectField } from '@/components/ui';
import { getTaskStatusLabel } from '@/lib/presentation/labels';
import { updateTaskQuadrantAction } from './actions';

type TaskItem = {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  important: boolean;
  urgent: boolean;
  dueDate: string | null;
  keyResultLinks?: Array<{
    keyResult: {
      id: string;
      title: string;
    };
  }>;
};

type QuadrantKey = 'do' | 'decide' | 'delegate' | 'delete';

function getQuadrant(task: TaskItem): QuadrantKey {
  if (task.important && task.urgent) return 'do';
  if (task.important) return 'decide';
  if (task.urgent) return 'delegate';
  return 'delete';
}

const quadrantMeta: Record<QuadrantKey, { title: string; subtitle: string; important: boolean; urgent: boolean }> = {
  do: {
    title: '重要且紧急',
    subtitle: '立刻处理',
    important: true,
    urgent: true,
  },
  decide: {
    title: '重要但不紧急',
    subtitle: '安排并保护时间',
    important: true,
    urgent: false,
  },
  delegate: {
    title: '紧急但不重要',
    subtitle: '减少干扰',
    important: false,
    urgent: true,
  },
  delete: {
    title: '不重要也不紧急',
    subtitle: '质疑它是否值得存在',
    important: false,
    urgent: false,
  },
};

export function QuadrantsClient({ tasks }: { tasks: TaskItem[] }) {
  const [items, setItems] = useState(tasks);
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  const grouped = useMemo(() => ({
    do: items.filter((task) => getQuadrant(task) === 'do'),
    decide: items.filter((task) => getQuadrant(task) === 'decide'),
    delegate: items.filter((task) => getQuadrant(task) === 'delegate'),
    delete: items.filter((task) => getQuadrant(task) === 'delete'),
  }), [items]);

  function moveTask(taskId: string, target: QuadrantKey) {
    const meta = quadrantMeta[target];
    setItems((current) => current.map((task) => task.id === taskId ? {
      ...task,
      important: meta.important,
      urgent: meta.urgent,
    } : task));
  }

  function persistMove(task: TaskItem, target: QuadrantKey) {
    const previous = getQuadrant(task);
    if (previous === target) return;

    const meta = quadrantMeta[target];
    setError('');
    moveTask(task.id, target);

    startTransition(async () => {
      const result = await updateTaskQuadrantAction(task.id, { important: meta.important, urgent: meta.urgent });
      if (result?.error) {
        moveTask(task.id, previous);
        setError(result.error);
      }
    });
  }

  function handleDragStart(event: DragStartEvent) {
    const task = items.find((item) => item.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const task = items.find((item) => item.id === event.active.id);
    const target = event.over?.id;
    setActiveTask(null);

    if (!task || !isQuadrantKey(target)) return;
    persistMove(task, target);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">优先级视图</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">四象限</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
          这是任务的四象限投影。切换象限只会更新 `important` 和 `urgent`，不会改变任务流程状态。
        </p>
      </div>

      {error && <FeedbackAlert tone="error" message={error} />}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {(Object.keys(quadrantMeta) as QuadrantKey[]).map((key) => (
            <QuadrantColumn
              key={key}
              quadrantKey={key}
              tasks={grouped[key]}
              onMove={persistMove}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} currentQuadrant={getQuadrant(activeTask)} dragging />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function isQuadrantKey(value: unknown): value is QuadrantKey {
  return value === 'do' || value === 'decide' || value === 'delegate' || value === 'delete';
}

function QuadrantColumn({
  quadrantKey,
  tasks,
  onMove,
}: {
  quadrantKey: QuadrantKey;
  tasks: TaskItem[];
  onMove: (task: TaskItem, target: QuadrantKey) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: quadrantKey });
  const meta = quadrantMeta[quadrantKey];

  return (
    <section
      ref={setNodeRef}
      className={`min-h-64 rounded-md border bg-[var(--bg-panel)] p-5 transition-colors ${
        isOver ? 'border-[var(--border-strong)]' : 'border-[var(--border-subtle)]'
      }`}
    >
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{meta.subtitle}</p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{meta.title}</h2>
      </div>
      {tasks.length === 0 ? (
        <Empty text="这个象限里还没有任务。" />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <DraggableTaskCard key={task.id} task={task} currentQuadrant={quadrantKey} onMove={onMove} />
          ))}
        </div>
      )}
    </section>
  );
}

function DraggableTaskCard({
  task,
  currentQuadrant,
  onMove,
}: {
  task: TaskItem;
  currentQuadrant: QuadrantKey;
  onMove: (task: TaskItem, target: QuadrantKey) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <TaskCard
      ref={setNodeRef}
      task={task}
      currentQuadrant={currentQuadrant}
      onMove={onMove}
      dragging={isDragging}
      dragAttributes={attributes}
      dragListeners={listeners}
      style={style}
    />
  );
}

function TaskCard({
  task,
  currentQuadrant,
  onMove,
  dragging = false,
  dragAttributes,
  dragListeners,
  style,
  ref,
}: {
  task: TaskItem;
  currentQuadrant: QuadrantKey;
  onMove?: (task: TaskItem, target: QuadrantKey) => void;
  dragging?: boolean;
  dragAttributes?: ButtonHTMLAttributes<HTMLButtonElement>;
  dragListeners?: ButtonHTMLAttributes<HTMLButtonElement>;
  style?: CSSProperties;
  ref?: Ref<HTMLElement>;
}) {
  const quadrantOptions = (Object.entries(quadrantMeta) as Array<[QuadrantKey, typeof quadrantMeta[QuadrantKey]]>).map(([key, meta]) => ({
    value: key,
    label: meta.title,
  }));

  return (
    <article
      ref={ref}
      style={style}
      className={`rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 transition-opacity ${dragging ? 'opacity-70' : ''}`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mb-2 cursor-grab px-2 py-1 text-xs text-[var(--text-muted)] active:cursor-grabbing"
            {...dragAttributes}
            {...dragListeners}
          >
            拖动
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-[var(--text-primary)]">{task.title}</p>
            <span className="text-xs text-[var(--text-muted)]">{getTaskStatusLabel(task.status)}</span>
            {task.dueDate && <span className="text-xs text-[var(--text-muted)]">截止 {task.dueDate}</span>}
          </div>
          {task.notes && <p className="mt-2 text-sm text-[var(--text-secondary)]">{task.notes}</p>}
          {task.keyResultLinks && task.keyResultLinks.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {task.keyResultLinks.map((link) => (
                  <a key={link.keyResult.id} href={`/okr/${link.keyResult.id}`} className="rounded-md border border-[var(--border-subtle)] px-2 py-1 text-xs text-[var(--text-secondary)]">
                  {link.keyResult.title}
                </a>
              ))}
            </div>
          )}
        </div>

        {onMove && (
          <form
            action={(formData: FormData) => {
              const nextQuadrant = String(formData.get('quadrant') ?? '');
              if (isQuadrantKey(nextQuadrant)) {
                onMove(task, nextQuadrant);
              }
            }}
            className="min-w-40"
          >
            <SelectField
              name="quadrant"
              label="移动到"
              defaultValue={currentQuadrant}
              options={quadrantOptions}
            />
            <Button type="submit" variant="secondary" fullWidth className="mt-2 text-xs">
              移动
            </Button>
          </form>
        )}
      </div>
    </article>
  );
}
