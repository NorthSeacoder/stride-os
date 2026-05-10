'use client';

import { Badge, Button, Empty, ErrorAlert, SelectField, TextareaField, TextField } from '@/components/ui';
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
      </div>

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
        <div className="space-y-4">
          {periods.map((period) => (
            <section key={period.id} className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {getPeriodTypeLabel(period.type)} / {getPeriodStatusLabel(period.status)}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{period.name}</h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {period.startDate} 至 {period.endDate}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setObjectivePeriodId(objectivePeriodId === period.id ? null : period.id)}
                >
                  {objectivePeriodId === period.id ? '收起目标表单' : '新增目标'}
                </Button>
              </div>

              {objectivePeriodId === period.id && (
                <form action={objectiveAction} className="mt-4 space-y-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                  <input type="hidden" name="periodId" value={period.id} />
                  {objectiveState.error && <ErrorAlert message={objectiveState.error} />}
                  <TextField name="title" label="目标标题" required />
                  <TextareaField name="description" label="描述" rows={2} />
                  <Button type="submit" variant="primary">
                    创建目标
                  </Button>
                </form>
              )}

              <div className="mt-5 space-y-4">
                {period.objectives.length === 0 ? (
                  <Empty text="这个周期下还没有目标。" />
                ) : (
                  period.objectives.map((objective) => (
                    <div key={objective.id} className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-[var(--text-primary)]">{objective.title}</h3>
                          {objective.description && <p className="mt-2 text-sm text-[var(--text-secondary)]">{objective.description}</p>}
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
                        <form action={krAction} className="mt-4 grid gap-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 md:grid-cols-2">
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
                            <Link key={keyResult.id} href={`/okr/${keyResult.id}`} className="block rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 hover:bg-[var(--bg-canvas)]">
                              <div className="flex flex-wrap items-center gap-3">
                                <p className="font-medium text-[var(--text-primary)]">{keyResult.title}</p>
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
            </section>
          ))}
        </div>
      )}
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
    <form action={action} className="space-y-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
      {error && <ErrorAlert message={error} />}
      <div className="grid gap-4 md:grid-cols-2">
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
      <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-secondary)]">
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
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          name="quarter"
          label="季度"
          value={quarter}
          onValueChange={(value) => onQuarterChange(value as Quarter)}
          options={options}
        />
        <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-secondary)]">
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
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          name="month"
          label="月份"
          value={month}
          onValueChange={onMonthChange}
          options={options}
        />
        <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-secondary)]">
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
    <div className="grid gap-4 md:grid-cols-2">
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
      <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-secondary)] md:col-span-2">
        自定义周期按月份粒度保存，系统会自动展开为具体日期。
        <input type="hidden" name="startDate" value={startRange.startDate} />
        <input type="hidden" name="endDate" value={endRange.endDate} />
      </div>
    </div>
  );
}
