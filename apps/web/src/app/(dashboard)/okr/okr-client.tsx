'use client';

import { Badge, Button, Empty, ErrorAlert, PageIntro, SectionHeader, SelectField, SurfacePanel, TextareaField, TextField } from '@/components/ui';
import { useActionState, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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

type PeriodType = 'year' | 'quarter' | 'month' | 'custom';
type Quarter = 'q1' | 'q2' | 'q3' | 'q4';

export function OkrClient({ periods }: { periods: PeriodView[] }) {
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [objectivePeriodId, setObjectivePeriodId] = useState<string | null>(null);
  const [krObjectiveId, setKrObjectiveId] = useState<string | null>(null);
  const [activePeriodId, setActivePeriodId] = useState<string | null>(periods[0]?.id ?? null);
  const [periodType, setPeriodType] = useState<PeriodType>('quarter');
  const [periodQuarter, setPeriodQuarter] = useState<Quarter>('q1');
  const [periodMonth, setPeriodMonth] = useState('01');
  const [customStartMonth, setCustomStartMonth] = useState('01');
  const [customEndMonth, setCustomEndMonth] = useState('12');
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

  useEffect(() => {
    setActivePeriodId((current) => {
      if (!periods.length) return null;
      if (current && periods.some((period) => period.id === current)) return current;
      return periods[0]?.id ?? null;
    });
  }, [periods]);

  const activePeriod = periods.find((period) => period.id === activePeriodId) ?? periods[0] ?? null;

  return (
    <div className="space-y-3">
      <PageIntro
        eyebrow="目标体系"
        title="OKR"
        description="在这里搭建周期、目标和关键结果。每个 KR 的 check-in 仍在详情页完成。"
        action={
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setPeriodType('quarter');
              setShowPeriodForm((value) => !value);
            }}
          >
            {showPeriodForm ? '收起周期表单' : '新建周期'}
          </Button>
        }
      />

      {showPeriodForm && (
        <PeriodForm
          periodType={periodType}
          periodQuarter={periodQuarter}
          periodMonth={periodMonth}
          customStartMonth={customStartMonth}
          customEndMonth={customEndMonth}
          onPeriodTypeChange={setPeriodType}
          onPeriodQuarterChange={setPeriodQuarter}
          onPeriodMonthChange={setPeriodMonth}
          onCustomStartMonthChange={setCustomStartMonth}
          onCustomEndMonthChange={setCustomEndMonth}
          action={periodAction}
          error={periodState.error}
        />
      )}

      {periods.length === 0 ? (
        <Empty text="还没有周期。先创建第一个周期，开始搭建 OKR 结构。" />
      ) : (
        <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
          <SurfacePanel className="metal-frame instrument-surface p-3.5">
            <SectionHeader
              eyebrow="Period Index"
              title="周期列表"
              description="先锁定当前周期，再在右侧展开目标和关键结果。"
            />
            <div className="mt-3 space-y-2">
              {periods.map((period) => {
                const active = activePeriod?.id === period.id;

                return (
                  <button
                    key={period.id}
                    type="button"
                    onClick={() => setActivePeriodId(period.id)}
                    className={`metal-frame block w-full rounded-[var(--radius-compact)] border p-3 text-left transition-colors ${
                      active
                        ? 'border-(--border-glow) bg-[color:rgba(180,204,255,0.08)]'
                        : 'border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] hover:border-(--border-glow) hover:bg-[color:rgba(255,255,255,0.05)]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{getPeriodTypeLabel(period.type)}</Badge>
                      <Badge>{getPeriodStatusLabel(period.status)}</Badge>
                    </div>
                    <p className="mt-2 text-base font-semibold text-(--text-primary)">{period.name}</p>
                    <p className="mt-2 text-sm text-(--text-secondary)">
                      {period.startDate} 至 {period.endDate}
                    </p>
                    <p className="mt-3 text-xs text-(--text-muted)">
                      {period.objectives.length} 个目标 /{' '}
                      {period.objectives.reduce((count, objective) => count + objective.keyResults.length, 0)} 个 KR
                    </p>
                  </button>
                );
              })}
            </div>
          </SurfacePanel>

          {activePeriod ? (
            <SurfacePanel className="metal-frame instrument-surface p-3.5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">
                    {getPeriodTypeLabel(activePeriod.type)} / {getPeriodStatusLabel(activePeriod.status)}
                  </p>
                  <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-(--text-primary)">{activePeriod.name}</h2>
                  <p className="mt-2 text-sm text-(--text-secondary)">
                    {activePeriod.startDate} 至 {activePeriod.endDate}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setObjectivePeriodId(objectivePeriodId === activePeriod.id ? null : activePeriod.id)}
                >
                  {objectivePeriodId === activePeriod.id ? '收起目标表单' : '新增目标'}
                </Button>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <InspectorMetric label="目标数" value={String(activePeriod.objectives.length)} />
                <InspectorMetric
                  label="关键结果数"
                  value={String(activePeriod.objectives.reduce((count, objective) => count + objective.keyResults.length, 0))}
                />
                <InspectorMetric
                  label="活跃信心"
                  value={
                    activePeriod.objectives.some((objective) =>
                      objective.keyResults.some((keyResult) => keyResult.confidence),
                    )
                      ? '已记录'
                      : '待补充'
                  }
                />
              </div>

              {objectivePeriodId === activePeriod.id && (
                <form action={objectiveAction} className="mt-3 grid gap-3 rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-3">
                  <input type="hidden" name="periodId" value={activePeriod.id} />
                  {objectiveState.error && <ErrorAlert message={objectiveState.error} />}
                  <TextField name="title" label="目标标题" required />
                  <TextareaField name="description" label="描述" rows={2} />
                  <div>
                    <Button type="submit" variant="primary">
                      创建目标
                    </Button>
                  </div>
                </form>
              )}

              <div className="mt-3 space-y-3">
                {activePeriod.objectives.length === 0 ? (
                  <Empty text="这个周期下还没有目标。" />
                ) : (
                  activePeriod.objectives.map((objective) => (
                    <div key={objective.id} className="metal-frame rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">Objective</p>
                          <h3 className="mt-2 text-xl font-medium text-(--text-primary)">{objective.title}</h3>
                          {objective.description && <p className="mt-2 text-sm text-(--text-secondary)">{objective.description}</p>}
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setKrObjectiveId(krObjectiveId === objective.id ? null : objective.id)}
                        >
                          {krObjectiveId === objective.id ? '收起 KR 表单' : '新增关键结果'}
                        </Button>
                      </div>

                      {krObjectiveId === objective.id && (
                        <form action={krAction} className="mt-3 grid gap-3 rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-3 md:grid-cols-2">
                          <input type="hidden" name="objectiveId" value={objective.id} />
                          {krState.error && <div className="md:col-span-2"><ErrorAlert message={krState.error} /></div>}
                          <div className="md:col-span-2">
                            <TextField name="title" label="KR 标题" required />
                          </div>
                          <SelectField
                            name="type"
                            label="类型"
                            defaultValue="numeric"
                            options={[
                              { value: 'numeric', label: '数值型' },
                              { value: 'milestone', label: '里程碑型' },
                              { value: 'hybrid', label: '混合型' },
                            ]}
                          />
                          <TextField name="unit" label="单位" />
                          <TextField name="targetValue" label="目标值" type="number" step="0.01" />
                          <TextField name="currentValue" label="当前值" type="number" step="0.01" />
                          <div className="md:col-span-2">
                            <Button type="submit" variant="primary">
                              创建关键结果
                            </Button>
                          </div>
                        </form>
                      )}

                      <div className="mt-4 space-y-3">
                        {objective.keyResults.length === 0 ? (
                          <Empty text="这个目标下还没有关键结果。" />
                        ) : (
                          objective.keyResults.map((keyResult) => (
                            <Link
                              key={keyResult.id}
                              href={`/okr/${keyResult.id}`}
                              className="metal-frame block rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-3 transition-colors hover:border-(--border-glow) hover:bg-[color:rgba(255,255,255,0.05)]"
                            >
                              <p className="font-medium text-(--text-primary)">{keyResult.title}</p>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Badge>{getKeyResultTypeLabel(keyResult.type)}</Badge>
                                <Badge>{getKeyResultStatusLabel(keyResult.status)}</Badge>
                                <Badge>进度 {keyResult.currentValue ?? '暂无'} / {keyResult.targetValue ?? '暂无'}</Badge>
                                <Badge>信心 {getConfidenceLabel(keyResult.confidence)}</Badge>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SurfacePanel>
          ) : null}
        </div>
      )}
    </div>
  );
}

function InspectorMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metal-frame rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-(--text-primary)">{value}</p>
    </div>
  );
}

function getQuarterRange(quarter: Quarter) {
  const year = new Date().getFullYear();
  const ranges = {
    q1: { startDate: `${year}-01-01`, endDate: `${year}-03-31` },
    q2: { startDate: `${year}-04-01`, endDate: `${year}-06-30` },
    q3: { startDate: `${year}-07-01`, endDate: `${year}-09-30` },
    q4: { startDate: `${year}-10-01`, endDate: `${year}-12-31` },
  };
  return ranges[quarter];
}

function getMonthRange(month: string) {
  const year = new Date().getFullYear();
  const monthIndex = Number(month);
  const nextMonth = monthIndex === 12 ? 1 : monthIndex + 1;
  const nextMonthYear = monthIndex === 12 ? year + 1 : year;
  const endDay = new Date(nextMonthYear, nextMonth - 1, 0).getDate();

  return {
    startDate: `${year}-${String(monthIndex).padStart(2, '0')}-01`,
    endDate: `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
  };
}

function PeriodForm({
  periodType,
  periodQuarter,
  periodMonth,
  customStartMonth,
  customEndMonth,
  onPeriodTypeChange,
  onPeriodQuarterChange,
  onPeriodMonthChange,
  onCustomStartMonthChange,
  onCustomEndMonthChange,
  action,
  error,
}: {
  periodType: PeriodType;
  periodQuarter: Quarter;
  periodMonth: string;
  customStartMonth: string;
  customEndMonth: string;
  onPeriodTypeChange: (value: PeriodType) => void;
  onPeriodQuarterChange: (value: Quarter) => void;
  onPeriodMonthChange: (value: string) => void;
  onCustomStartMonthChange: (value: string) => void;
  onCustomEndMonthChange: (value: string) => void;
  action: (formData: FormData) => void;
  error: string;
}) {
  const typeOptions = useMemo(() => [
    { value: 'year', label: '年度' },
    { value: 'quarter', label: '季度' },
    { value: 'month', label: '月度' },
    { value: 'custom', label: '自定义' },
  ], []);

  return (
    <form action={action} className="metal-frame instrument-surface space-y-3 rounded-[var(--radius-compact)] border border-(--border-hairline) p-3.5">
      {error && <ErrorAlert message={error} />}
      <div className="grid gap-3 md:grid-cols-2">
        <TextField name="name" label="名称" required />
        <SelectField
          name="type"
          label="类型"
          value={periodType}
          onValueChange={(value) => onPeriodTypeChange(value as PeriodType)}
          options={typeOptions}
        />
      </div>

      <PeriodDateFields
        type={periodType}
        quarter={periodQuarter}
        month={periodMonth}
        customStartMonth={customStartMonth}
        customEndMonth={customEndMonth}
        onQuarterChange={onPeriodQuarterChange}
        onMonthChange={onPeriodMonthChange}
        onCustomStartMonthChange={onCustomStartMonthChange}
        onCustomEndMonthChange={onCustomEndMonthChange}
      />

      <Button type="submit" variant="primary">
        创建周期
      </Button>
    </form>
  );
}

function PeriodDateFields({
  type,
  quarter,
  month,
  customStartMonth,
  customEndMonth,
  onQuarterChange,
  onMonthChange,
  onCustomStartMonthChange,
  onCustomEndMonthChange,
}: {
  type: PeriodType;
  quarter: Quarter;
  month: string;
  customStartMonth: string;
  customEndMonth: string;
  onQuarterChange: (value: Quarter) => void;
  onMonthChange: (value: string) => void;
  onCustomStartMonthChange: (value: string) => void;
  onCustomEndMonthChange: (value: string) => void;
}) {
  if (type === 'year') {
    const year = new Date().getFullYear();

    return (
      <div className="rounded-[14px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] px-3 py-2 text-sm text-(--text-secondary)">
        年度周期默认覆盖当前年，不需要单独选开始/结束日期。
        <input type="hidden" name="startDate" value={`${year}-01-01`} />
        <input type="hidden" name="endDate" value={`${year}-12-31`} />
      </div>
    );
  }

  if (type === 'quarter') {
    const options: Array<{ value: Quarter; label: string }> = [
      { value: 'q1', label: 'Q1' },
      { value: 'q2', label: 'Q2' },
      { value: 'q3', label: 'Q3' },
      { value: 'q4', label: 'Q4' },
    ];
    const range = getQuarterRange(quarter);

    return (
      <div className="grid gap-3 md:grid-cols-2">
        <SelectField
          name="quarter"
          label="季度"
          value={quarter}
          onValueChange={(value) => onQuarterChange(value as Quarter)}
          options={options}
        />
        <div className="rounded-[14px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] px-3 py-2 text-sm text-(--text-secondary)">
          当前季度会自动展开成具体起止日期。
          <input type="hidden" name="startDate" value={range.startDate} />
          <input type="hidden" name="endDate" value={range.endDate} />
        </div>
      </div>
    );
  }

  if (type === 'month') {
    const options = Array.from({ length: 12 }, (_, index) => ({
      value: String(index + 1).padStart(2, '0'),
      label: `${index + 1} 月`,
    }));
    const range = getMonthRange(month);

    return (
      <div className="grid gap-3 md:grid-cols-2">
        <SelectField
          name="month"
          label="月份"
          value={month}
          onValueChange={onMonthChange}
          options={options}
        />
        <div className="rounded-[14px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] px-3 py-2 text-sm text-(--text-secondary)">
          月度周期会自动展开成具体起止日期。
          <input type="hidden" name="startDate" value={range.startDate} />
          <input type="hidden" name="endDate" value={range.endDate} />
        </div>
      </div>
    );
  }

  const monthOptions = Array.from({ length: 12 }, (_, index) => {
    const value = String(index + 1).padStart(2, '0');
    return { value, label: `${index + 1} 月` };
  });
  const startMonth = Math.max(1, Number(customStartMonth) || 1);
  const endMonth = Math.max(startMonth, Number(customEndMonth) || startMonth);
  const startRange = getMonthRange(String(startMonth).padStart(2, '0'));
  const endRange = getMonthRange(String(endMonth).padStart(2, '0'));

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <SelectField
        name="startMonth"
        label="开始月份"
        value={String(startMonth).padStart(2, '0')}
        onValueChange={(nextValue) => {
          onCustomStartMonthChange(nextValue);
          if (Number(nextValue) > endMonth) {
            onCustomEndMonthChange(nextValue);
          }
        }}
        options={monthOptions}
      />
      <SelectField
        name="endMonth"
        label="结束月份"
        value={String(endMonth).padStart(2, '0')}
        onValueChange={onCustomEndMonthChange}
        options={monthOptions.filter((option) => Number(option.value) >= startMonth)}
      />
      <div className="rounded-[14px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] px-3 py-2 text-sm text-(--text-secondary) md:col-span-2">
        自定义周期按月份粒度保存，系统会自动展开为具体日期。
        <input type="hidden" name="startDate" value={startRange.startDate} />
        <input type="hidden" name="endDate" value={endRange.endDate} />
      </div>
    </div>
  );
}
