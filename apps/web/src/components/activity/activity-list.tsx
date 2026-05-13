import { Empty } from '@/components/ui';
import type { ActivityListRow } from '@/lib/services/activity-service';
import { ActivityRow } from './activity-row';

export function ActivityList({
  items,
  emptyText = '还没有活动记录。',
}: {
  items: ActivityListRow[];
  emptyText?: string;
}) {
  if (items.length === 0) {
    return <Empty text={emptyText} />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ActivityRow key={item.id} item={item} />
      ))}
    </div>
  );
}
