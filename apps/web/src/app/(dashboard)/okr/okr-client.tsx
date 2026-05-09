'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { Empty, ErrorAlert } from '@/components/ui';
import {
  getConfidenceLabel,
  getKeyResultStatusLabel,
  getKeyResultTypeLabel,
  getPeriodStatusLabel,
  getPeriodTypeLabel,
} from '@/lib/presentation/labels';
import {
  createKeyResultAction,
  createObjectiveAction,
  createPeriodAction,
  type OkrActionState,
} from './actions';

type PeriodView = {
  id: string;
  name: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  objectives: Array<{
    id: string;
    title: string;
    description: string | null;
    sortOrder: number;
    keyResults: Array<{
      id: string;
      title: string;
      type: string;
      status: string;
      currentValue: number | null;
      targetValue: number | null;
      confidence: string | null;
    }>;
  }>;
};

const initialState: OkrActionState = { error: '' };

export function OkrClient({ periods }: { periods: PeriodView[] }) {
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [objectivePeriodId, setObjectivePeriodId] = useState<string | null>(null);
  const [krObjectiveId, setKrObjectiveId] = useState<string | null>(null);
  const [periodState, periodAction] = useActionState(createPeriodAction, initialState);
  const [objectiveState, objectiveAction] = useActionState(createObjectiveAction, initialState);
  const [krState, krAction] = useActionState(createKeyResultAction, initialState);

  useEffect(() => {
    if (!periodState.error) setShowPeriodForm(false);
  }, [periodState]);
  useEffect(() => {
    if (!objectiveState.error) setObjectivePeriodId(null);
  }, [objectiveState]);
  useEffect(() => {
    if (!krState.error) setKrObjectiveId(null);
  }, [krState]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">目标体系</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">OKR</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
            在这里搭建 OKR 层级：周期、目标和关键结果。每个 KR 的 check-in 在详情页完成。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPeriodForm((value) => !value)}
          className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]"
        >
          {showPeriodForm ? '收起周期表单' : '新建周期'}
        </button>
      </div>

      {showPeriodForm && (
        <form action={periodAction} className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
          {periodState.error && <ErrorAlert message={periodState.error} />}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm text-[var(--text-secondary)]">名称</span>
              <input name="name" required className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-[var(--text-secondary)]">类型</span>
              <select name="type" defaultValue="quarter" className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]">
                <option value="year">年度</option>
                <option value="quarter">季度</option>
                <option value="custom">自定义</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-[var(--text-secondary)]">开始日期</span>
              <input type="date" name="startDate" required className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-[var(--text-secondary)]">结束日期</span>
              <input type="date" name="endDate" required className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]" />
            </label>
          </div>
          <button type="submit" className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]">
            创建周期
          </button>
        </form>
      )}

      {periods.length === 0 ? (
        <Empty text="还没有周期。先创建第一个周期，开始搭建 OKR 结构。" />
      ) : (
        <div className="space-y-4">
          {periods.map((period) => (
            <section key={period.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{getPeriodTypeLabel(period.type)} / {getPeriodStatusLabel(period.status)}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{period.name}</h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{period.startDate} 至 {period.endDate}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setObjectivePeriodId(objectivePeriodId === period.id ? null : period.id)}
                  className="rounded-md border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]"
                >
                  {objectivePeriodId === period.id ? '收起目标表单' : '新增目标'}
                </button>
              </div>

              {objectivePeriodId === period.id && (
                <form action={objectiveAction} className="mt-4 space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                  <input type="hidden" name="periodId" value={period.id} />
                  {objectiveState.error && <ErrorAlert message={objectiveState.error} />}
                  <label className="block">
                    <span className="mb-1 block text-sm text-[var(--text-secondary)]">目标标题</span>
                    <input name="title" required className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-[var(--text-secondary)]">描述</span>
                    <textarea name="description" rows={2} className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]" />
                  </label>
                  <button type="submit" className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]">
                    创建目标
                  </button>
                </form>
              )}

              <div className="mt-5 space-y-4">
                {period.objectives.length === 0 ? (
                  <Empty text="这个周期下还没有目标。" />
                ) : (
                  period.objectives.map((objective) => (
                    <div key={objective.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-[var(--text-primary)]">{objective.title}</h3>
                          {objective.description && <p className="mt-2 text-sm text-[var(--text-secondary)]">{objective.description}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setKrObjectiveId(krObjectiveId === objective.id ? null : objective.id)}
                          className="rounded-md border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]"
                        >
                          {krObjectiveId === objective.id ? '收起 KR 表单' : '新增关键结果'}
                        </button>
                      </div>

                      {krObjectiveId === objective.id && (
                        <form action={krAction} className="mt-4 grid gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 md:grid-cols-2">
                          <input type="hidden" name="objectiveId" value={objective.id} />
                          {krState.error && <div className="md:col-span-2"><ErrorAlert message={krState.error} /></div>}
                          <label className="block md:col-span-2">
                            <span className="mb-1 block text-sm text-[var(--text-secondary)]">KR 标题</span>
                            <input name="title" required className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]" />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-sm text-[var(--text-secondary)]">类型</span>
                            <select name="type" defaultValue="numeric" className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]">
                              <option value="numeric">数值型</option>
                              <option value="milestone">里程碑型</option>
                              <option value="hybrid">混合型</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-sm text-[var(--text-secondary)]">单位</span>
                            <input name="unit" className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]" />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-sm text-[var(--text-secondary)]">目标值</span>
                            <input name="targetValue" type="number" step="0.01" className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]" />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-sm text-[var(--text-secondary)]">当前值</span>
                            <input name="currentValue" type="number" step="0.01" className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]" />
                          </label>
                          <div className="md:col-span-2">
                            <button type="submit" className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]">
                              创建关键结果
                            </button>
                          </div>
                        </form>
                      )}

                      <div className="mt-4 space-y-3">
                        {objective.keyResults.length === 0 ? (
                          <Empty text="这个目标下还没有关键结果。" />
                        ) : (
                          objective.keyResults.map((keyResult) => (
                            <Link key={keyResult.id} href={`/okr/${keyResult.id}`} className="block rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 hover:bg-[var(--bg-canvas)]">
                              <div className="flex flex-wrap items-center gap-3">
                                <p className="font-medium text-[var(--text-primary)]">{keyResult.title}</p>
                                <span className="text-xs text-[var(--text-muted)]">{getKeyResultTypeLabel(keyResult.type)}</span>
                                <span className="text-xs text-[var(--text-muted)]">{getKeyResultStatusLabel(keyResult.status)}</span>
                                <span className="text-xs text-[var(--text-muted)]">进度 {keyResult.currentValue ?? '暂无'} / {keyResult.targetValue ?? '暂无'}</span>
                                <span className="text-xs text-[var(--text-muted)]">信心 {getConfidenceLabel(keyResult.confidence)}</span>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
