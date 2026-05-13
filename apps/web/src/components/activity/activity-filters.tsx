'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { startTransition, type FormEvent } from 'react';
import { Button, SelectField, SurfacePanel, TextField } from '@/components/ui';
import {
  ACTIVITY_SOURCES,
  ACTIVITY_TARGET_TYPES,
} from '@/lib/activity/constants';
import { buildActivityHref } from '@/lib/activity/search-params';

const actionOptions = [
  { value: '', label: '全部动作' },
  { value: 'task.create', label: '创建任务' },
  { value: 'task.update', label: '更新任务' },
  { value: 'task.complete', label: '完成任务' },
  { value: 'task.archive', label: '归档任务' },
  { value: 'okr.key_result.check_in', label: 'KR Check-in' },
  { value: 'review.finalize', label: '完成复盘' },
];

const changedFieldOptions = [
  { value: '', label: '全部字段' },
  { value: 'status', label: '状态' },
  { value: 'dueDate', label: '截止日期' },
  { value: 'priority', label: '优先级' },
  { value: 'title', label: '标题' },
  { value: 'currentValue', label: '当前值' },
  { value: 'confidence', label: '信心' },
];

function buildSourceOptions() {
  return [
    { value: '', label: '全部来源' },
    ...ACTIVITY_SOURCES.map((source) => ({ value: source, label: source })),
  ];
}

function buildTargetTypeOptions() {
  return [
    { value: '', label: '全部对象' },
    ...ACTIVITY_TARGET_TYPES.map((targetType) => ({ value: targetType, label: targetType })),
  ];
}

export type ActivityFilterValues = {
  source: string;
  targetType: string;
  action: string;
  changedField: string;
  keyword: string;
};

export function ActivityFilters({
  values,
}: {
  values: ActivityFilterValues;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const target = buildActivityHref(pathname, formData.entries());
    startTransition(() => {
      router.push(target);
    });
  }

  return (
    <SurfacePanel className="metal-frame instrument-surface p-3.5">
      <form action="/activity" className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" onSubmit={handleSubmit}>
        <SelectField
          name="source"
          label="来源"
          defaultValue={values.source}
          options={buildSourceOptions()}
        />
        <SelectField
          name="targetType"
          label="对象"
          defaultValue={values.targetType}
          options={buildTargetTypeOptions()}
        />
        <SelectField
          name="action"
          label="动作"
          defaultValue={values.action}
          options={actionOptions}
        />
        <SelectField
          name="changedField"
          label="变更字段"
          defaultValue={values.changedField}
          options={changedFieldOptions}
        />
        <TextField
          name="keyword"
          label="关键词"
          defaultValue={values.keyword}
          placeholder="标题、摘要、动作"
        />
        <div className="flex items-end gap-2 md:col-span-2 xl:col-span-5">
          <Button type="submit" size="sm">
            应用筛选
          </Button>
          <Link
            href="/activity"
            className="rounded-[var(--radius-compact)] border border-(--border-hairline) px-3 py-2 text-sm text-(--text-secondary) transition-colors hover:border-(--border-glow) hover:text-(--text-primary)"
          >
            清除
          </Link>
        </div>
      </form>
    </SurfacePanel>
  );
}
