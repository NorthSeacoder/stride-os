'use client';

import { Empty } from '@/components/ui';
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
  const grouped = {
    do: tasks.filter((task) => getQuadrant(task) === 'do'),
    decide: tasks.filter((task) => getQuadrant(task) === 'decide'),
    delegate: tasks.filter((task) => getQuadrant(task) === 'delegate'),
    delete: tasks.filter((task) => getQuadrant(task) === 'delete'),
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">优先级视图</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">四象限</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
          这是任务的四象限投影。切换象限只会更新 `important` 和 `urgent`，不会改变任务流程状态。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(Object.keys(quadrantMeta) as QuadrantKey[]).map((key) => (
          <section key={key} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{quadrantMeta[key].subtitle}</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{quadrantMeta[key].title}</h2>
            </div>
            {grouped[key].length === 0 ? (
              <Empty text="这个象限里还没有任务。" />
            ) : (
              <div className="space-y-3">
                {grouped[key].map((task) => (
                  <article key={task.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-[var(--text-primary)]">{task.title}</p>
                          <span className="text-xs text-[var(--text-muted)]">{getTaskStatusLabel(task.status)}</span>
                          {task.dueDate && <span className="text-xs text-[var(--text-muted)]">截止 {task.dueDate}</span>}
                        </div>
                        {task.notes && <p className="mt-2 text-sm text-[var(--text-secondary)]">{task.notes}</p>}
                        {task.keyResultLinks && task.keyResultLinks.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {task.keyResultLinks.map((link) => (
                              <a key={link.keyResult.id} href={`/okr/${link.keyResult.id}`} className="rounded-full border border-[var(--border-subtle)] px-2 py-1 text-xs text-[var(--text-secondary)]">
                                {link.keyResult.title}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(Object.entries(quadrantMeta) as Array<[QuadrantKey, typeof quadrantMeta[QuadrantKey]]>).map(([nextKey, meta]) => (
                          <form key={nextKey} action={async () => updateTaskQuadrantAction(task.id, { important: meta.important, urgent: meta.urgent })}>
                            <button
                              type="submit"
                              disabled={nextKey === key}
                              className="rounded-md border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-secondary)] disabled:opacity-50"
                            >
                              {nextKey === key ? '当前所在' : meta.subtitle}
                            </button>
                          </form>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
