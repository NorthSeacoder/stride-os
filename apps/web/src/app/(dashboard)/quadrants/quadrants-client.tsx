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
import {
  Badge,
  Button,
  Empty,
  FeedbackAlert,
  PageIntro,
  SectionHeader,
  SelectField,
  SurfacePanel,
} from '@/components/ui';
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

const quadrantMeta: Record<
  QuadrantKey,
  {
    title: string;
    subtitle: string;
    important: boolean;
    urgent: boolean;
    detail: string;
  }
> = {
  do: {
    title: '重要且紧急',
    subtitle: '立刻处理',
    important: true,
    urgent: true,
    detail: '需要立即投入的事项，应保持最短响应路径。',
  },
  decide: {
    title: '重要但不紧急',
    subtitle: '安排并保护时间',
    important: true,
    urgent: false,
    detail: '这类任务定义中长期进展，需要持续保护时间块。',
  },
  delegate: {
    title: '紧急但不重要',
    subtitle: '减少干扰',
    important: false,
    urgent: true,
    detail: '这些任务会制造噪声，应快速清理、缩短暴露时间。',
  },
  delete: {
    title: '不重要也不紧急',
    subtitle: '质疑它是否值得存在',
    important: false,
    urgent: false,
    detail: '默认应削减或删除，避免系统被低价值项侵占。',
  },
};

export function QuadrantsClient({ tasks }: { tasks: TaskItem[] }) {
  const [items, setItems] = useState(tasks);
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(tasks[0]?.id ?? null);
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    setItems(tasks);
    setSelectedTaskId((current) => {
      if (!tasks.length) return null;
      if (current && tasks.some((task) => task.id === current)) return current;
      return tasks[0]?.id ?? null;
    });
  }, [tasks]);

  const grouped = useMemo(
    () => ({
      do: items.filter((task) => getQuadrant(task) === 'do'),
      decide: items.filter((task) => getQuadrant(task) === 'decide'),
      delegate: items.filter((task) => getQuadrant(task) === 'delegate'),
      delete: items.filter((task) => getQuadrant(task) === 'delete'),
    }),
    [items],
  );

  const selectedTask =
    items.find((task) => task.id === activeTask?.id) ??
    items.find((task) => task.id === selectedTaskId) ??
    activeTask ??
    null;

  function moveTask(taskId: string, target: QuadrantKey) {
    const meta = quadrantMeta[target];
    setItems((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              important: meta.important,
              urgent: meta.urgent,
            }
          : task,
      ),
    );
  }

  function persistMove(task: TaskItem, target: QuadrantKey) {
    const previous = getQuadrant(task);
    if (previous === target) return;

    const meta = quadrantMeta[target];
    setError('');
    moveTask(task.id, target);
    setSelectedTaskId(task.id);

    startTransition(async () => {
      const result = await updateTaskQuadrantAction(task.id, {
        important: meta.important,
        urgent: meta.urgent,
      });
      if (result?.error) {
        moveTask(task.id, previous);
        setError(result.error);
      }
    });
  }

  function handleDragStart(event: DragStartEvent) {
    const task = items.find((item) => item.id === event.active.id);
    setActiveTask(task ?? null);
    if (task) {
      setSelectedTaskId(task.id);
    }
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
      <PageIntro
        eyebrow="优先级视图"
        title="四象限"
        description="这是任务的四象限投影。切换象限只会更新 important 和 urgent，不会改变任务流程状态。"
      />

      {error && <FeedbackAlert tone="error" message={error} />}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveTask(null)}
        >
          <SurfacePanel emphasis="strong" className="metal-frame instrument-surface p-4 md:p-5">
            <SectionHeader
              eyebrow="Planning Board"
              title="象限工作盘"
              description="中央区域是优先级主舞台，右侧详情区用于查看当前任务上下文。"
            />
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {(Object.keys(quadrantMeta) as QuadrantKey[]).map((key) => (
                <QuadrantColumn
                  key={key}
                  quadrantKey={key}
                  tasks={grouped[key]}
                  selectedTaskId={selectedTaskId}
                  onMove={persistMove}
                  onSelectTask={setSelectedTaskId}
                />
              ))}
            </div>
          </SurfacePanel>

          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} currentQuadrant={getQuadrant(activeTask)} dragging />}
          </DragOverlay>
        </DndContext>

        <SurfacePanel className="metal-frame instrument-surface p-5 md:p-6">
          <SectionHeader
            eyebrow="Task Inspector"
            title={selectedTask ? '当前任务详情' : '等待选择任务'}
            description={selectedTask ? '点击任务或拖拽中的任务会在这里显示摘要。' : '从左侧象限盘中选择一个任务查看细节。'}
          />

          {selectedTask ? (
            <TaskDetailPanel task={selectedTask} />
          ) : (
            <div className="mt-5">
              <Empty text="四个象限里还没有任务，或者尚未选择要查看的任务。" />
            </div>
          )}

          <div className="mt-6 rounded-[var(--radius-panel)] border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">象限规则</p>
            <div className="mt-4 space-y-3">
              {(Object.entries(quadrantMeta) as Array<[QuadrantKey, (typeof quadrantMeta)[QuadrantKey]]>).map(([key, meta]) => (
                <div key={key} className="rounded-[var(--radius-compact)] border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.02)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{meta.title}</p>
                    <Badge>{meta.subtitle}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{meta.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </SurfacePanel>
      </div>
    </div>
  );
}

function isQuadrantKey(value: unknown): value is QuadrantKey {
  return value === 'do' || value === 'decide' || value === 'delegate' || value === 'delete';
}

function QuadrantColumn({
  quadrantKey,
  tasks,
  selectedTaskId,
  onMove,
  onSelectTask,
}: {
  quadrantKey: QuadrantKey;
  tasks: TaskItem[];
  selectedTaskId: string | null;
  onMove: (task: TaskItem, target: QuadrantKey) => void;
  onSelectTask: (taskId: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: quadrantKey });
  const meta = quadrantMeta[quadrantKey];

  return (
    <section
      ref={setNodeRef}
      className={`metal-frame min-h-72 rounded-[18px] border p-5 transition-colors ${
        isOver
          ? 'border-[var(--border-glow)] bg-[color:rgba(180,204,255,0.07)]'
          : 'border-[var(--border-hairline)] instrument-surface'
      }`}
    >
      <div className="mb-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">{meta.subtitle}</p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{meta.title}</h2>
      </div>
      {tasks.length === 0 ? (
        <Empty text="这个象限里还没有任务。" />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              currentQuadrant={quadrantKey}
              selected={selectedTaskId === task.id}
              onMove={onMove}
              onSelectTask={onSelectTask}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DraggableTaskCard({
  task,
  currentQuadrant,
  selected,
  onMove,
  onSelectTask,
}: {
  task: TaskItem;
  currentQuadrant: QuadrantKey;
  selected: boolean;
  onMove: (task: TaskItem, target: QuadrantKey) => void;
  onSelectTask: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <TaskCard
      ref={setNodeRef}
      task={task}
      currentQuadrant={currentQuadrant}
      selected={selected}
      onMove={onMove}
      onSelectTask={onSelectTask}
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
  selected = false,
  onMove,
  onSelectTask,
  dragging = false,
  dragAttributes,
  dragListeners,
  style,
  ref,
}: {
  task: TaskItem;
  currentQuadrant: QuadrantKey;
  selected?: boolean;
  onMove?: (task: TaskItem, target: QuadrantKey) => void;
  onSelectTask?: (taskId: string) => void;
  dragging?: boolean;
  dragAttributes?: ButtonHTMLAttributes<HTMLButtonElement>;
  dragListeners?: ButtonHTMLAttributes<HTMLButtonElement>;
  style?: CSSProperties;
  ref?: Ref<HTMLElement>;
}) {
  const quadrantOptions = (Object.entries(quadrantMeta) as Array<[QuadrantKey, (typeof quadrantMeta)[QuadrantKey]]>).map(
    ([key, meta]) => ({
      value: key,
      label: meta.title,
    }),
  );

  return (
    <article
      ref={ref}
      style={style}
      className={`metal-frame rounded-[14px] border p-4 transition-[opacity,border-color,background-color] ${
        selected
          ? 'border-[var(--border-glow)] bg-[color:rgba(180,204,255,0.08)]'
          : 'border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.04)]'
      } ${dragging ? 'opacity-70' : ''}`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="cursor-grab px-2 py-1 text-xs active:cursor-grabbing"
                {...dragAttributes}
                {...dragListeners}
              >
                拖动
              </Button>
              <Badge>{getTaskStatusLabel(task.status)}</Badge>
              {task.dueDate && <span className="text-xs text-[var(--text-muted)]">截止 {task.dueDate}</span>}
            </div>
            <button
              type="button"
              onClick={() => onSelectTask?.(task.id)}
              className="mt-3 block text-left"
            >
              <p className="text-base font-medium text-[var(--text-primary)]">{task.title}</p>
            </button>
            {task.notes && <p className="mt-2 line-clamp-3 text-sm text-[var(--text-secondary)]">{task.notes}</p>}
          </div>

          {onMove && (
            <form
              action={(formData: FormData) => {
                const nextQuadrant = String(formData.get('quadrant') ?? '');
                if (isQuadrantKey(nextQuadrant)) {
                  onMove(task, nextQuadrant);
                }
              }}
              className="min-w-44"
            >
              <SelectField name="quadrant" label="移动到" defaultValue={currentQuadrant} options={quadrantOptions} />
              <Button type="submit" variant="secondary" fullWidth className="mt-2 text-xs">
                移动
              </Button>
            </form>
          )}
        </div>

        {task.keyResultLinks && task.keyResultLinks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {task.keyResultLinks.map((link) => (
              <a
                key={link.keyResult.id}
                href={`/okr/${link.keyResult.id}`}
                className="rounded-full border border-[var(--border-hairline)] px-2 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--border-glow)] hover:text-[var(--text-primary)]"
              >
                {link.keyResult.title}
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function TaskDetailPanel({ task }: { task: TaskItem }) {
  const meta = quadrantMeta[getQuadrant(task)];

  return (
    <div className="mt-5 space-y-4">
      <div className="metal-frame rounded-[16px] border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{meta.title}</Badge>
          <Badge>{getTaskStatusLabel(task.status)}</Badge>
        </div>
        <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{task.title}</h3>
        {task.notes ? (
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{task.notes}</p>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">该任务当前没有备注说明。</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InspectorMetric label="象限" value={meta.subtitle} />
        <InspectorMetric label="截止日期" value={task.dueDate ?? '未设置'} />
      </div>

      <div className="metal-frame rounded-[16px] border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">象限说明</p>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{meta.detail}</p>
      </div>

      <div className="metal-frame rounded-[16px] border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">关联 KR</p>
        {task.keyResultLinks && task.keyResultLinks.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {task.keyResultLinks.map((link) => (
              <a
                key={link.keyResult.id}
                href={`/okr/${link.keyResult.id}`}
                className="rounded-full border border-[var(--border-hairline)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-glow)] hover:text-[var(--text-primary)]"
              >
                {link.keyResult.title}
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">该任务当前未绑定任何 KR。</p>
        )}
      </div>
    </div>
  );
}

function InspectorMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metal-frame rounded-[16px] border border-[var(--border-hairline)] bg-[color:rgba(255,255,255,0.03)] p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
