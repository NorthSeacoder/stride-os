'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Badge, Empty } from '@/components/ui';
import type {
  ActivityDiffValue,
  ActivityListRow,
} from '@/lib/services/activity-service';
import {
  getActivityActionLabel,
  getActivitySourceLabel,
  getActivityTargetTypeLabel,
} from '@/lib/presentation/labels';

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function formatDiffValue(value: ActivityDiffValue, label?: string) {
  if (label) {
    return label;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(' / ') : '空';
  }

  if (value === null || value === '') {
    return '空';
  }

  return String(value);
}

function renderDiff(item: ActivityListRow) {
  if (item.diff.length === 0) {
    return null;
  }

  return (
    <details className="rounded-[10px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.02)] p-3">
      <summary className="cursor-pointer list-none text-xs uppercase tracking-[0.18em] text-(--text-secondary)">
        查看变更明细
      </summary>
      <div className="mt-3 space-y-2">
        {item.diff.map((entry) => (
          <div
            key={`${item.id}-${entry.field}`}
            className="grid gap-2 text-sm text-(--text-secondary) md:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)]"
          >
            <span className="text-(--text-muted)">{entry.label}</span>
            <span className="rounded-[8px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.02)] px-2.5 py-2">
              之前：{formatDiffValue(entry.before, entry.beforeLabel)}
            </span>
            <span className="rounded-[8px] border border-(--border-glow) bg-[color:rgba(180,204,255,0.05)] px-2.5 py-2 text-(--text-primary)">
              现在：{formatDiffValue(entry.after, entry.afterLabel)}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}

const columnHelper = createColumnHelper<ActivityListRow>();

const columns = [
  columnHelper.accessor('createdAt', {
    header: '时间',
    cell: (info) => (
      <div className="whitespace-nowrap text-xs uppercase tracking-[0.18em] text-(--text-muted)">
        {formatTimestamp(info.getValue())}
      </div>
    ),
  }),
  columnHelper.display({
    id: 'source',
    header: '来源',
    cell: (info) => {
      const item = info.row.original;
      return <Badge>{item.sourceLabel ?? getActivitySourceLabel(item.source)}</Badge>;
    },
  }),
  columnHelper.display({
    id: 'action',
    header: '动作',
    cell: (info) => (
      <span className="text-sm font-medium text-(--text-primary)">
        {getActivityActionLabel(info.row.original.action)}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'target',
    header: '对象',
    cell: (info) => {
      const item = info.row.original;
      return (
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm text-(--text-primary)">
              {item.targetTitle ?? '未命名对象'}
            </span>
            {item.targetType ? <Badge>{getActivityTargetTypeLabel(item.targetType)}</Badge> : null}
          </div>
        </div>
      );
    },
  }),
  columnHelper.display({
    id: 'summary',
    header: '摘要',
    cell: (info) => (
      <div className="space-y-2">
        <p className="text-sm text-(--text-secondary)">
          {info.row.original.summary ?? '没有额外摘要。'}
        </p>
        {renderDiff(info.row.original)}
      </div>
    ),
  }),
];

export function ActivityTable({
  items,
  emptyText = '还没有活动记录。',
}: {
  items: ActivityListRow[];
  emptyText?: string;
}) {
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (items.length === 0) {
    return <Empty text={emptyText} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-left">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="border-b border-(--border-hairline) px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-(--text-muted)"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="align-top">
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="border-b border-(--border-hairline) px-3 py-3"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
