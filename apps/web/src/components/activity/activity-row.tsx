import { Badge } from '@/components/ui';
import type { ActivityDiffValue, ActivityListRow } from '@/lib/services/activity-service';
import {
  getActivityActionLabel,
  getActivityActorTypeLabel,
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

function getActorLabel(item: ActivityListRow) {
  if (item.actorLabel) {
    return item.actorLabel;
  }

  if (item.actorId) {
    return `${getActivityActorTypeLabel(item.actorType)} ${item.actorId.slice(0, 8)}`;
  }

  return getActivityActorTypeLabel(item.actorType);
}

export function ActivityRow({ item }: { item: ActivityListRow }) {
  const sourceLabel = item.sourceLabel ?? getActivitySourceLabel(item.source);
  const targetTypeLabel = getActivityTargetTypeLabel(item.targetType);
  const actionLabel = getActivityActionLabel(item.action);
  const hasDiff = item.diff.length > 0;

  return (
    <article className="metal-frame rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-(--text-primary)">{actionLabel}</p>
            <Badge>{sourceLabel}</Badge>
            <Badge>{getActorLabel(item)}</Badge>
            {item.targetType && <Badge>{targetTypeLabel}</Badge>}
          </div>
          <div className="space-y-1">
            <p className="truncate text-sm text-(--text-primary)">
              {item.targetTitle ?? '未命名对象'}
            </p>
            <p className="text-sm text-(--text-secondary)">
              {item.summary ?? '没有额外摘要。'}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-xs uppercase tracking-[0.18em] text-(--text-muted)">
          {formatTimestamp(item.createdAt)}
        </div>
      </div>

      {hasDiff ? (
        <details className="mt-3 rounded-[10px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.02)] p-3">
          <summary className="cursor-pointer list-none text-xs uppercase tracking-[0.18em] text-(--text-secondary)">
            查看变更明细
          </summary>
          <div className="mt-3 space-y-2">
            {item.diff.map((entry) => (
              <div key={`${item.id}-${entry.field}`} className="grid gap-2 text-sm text-(--text-secondary) md:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)]">
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
      ) : null}
    </article>
  );
}
