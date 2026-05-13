import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ActivityList } from '@/components/activity/activity-list';
import { ActivityTable } from '@/components/activity/activity-table';
import type { ActivityListRow } from '@/lib/services/activity-service';

const sampleItem: ActivityListRow = {
  id: 'log_1',
  createdAt: new Date('2026-05-13T08:00:00.000Z'),
  actorType: 'user',
  actorId: 'user_1',
  actorLabel: 'Alice',
  action: 'task.update',
  targetType: 'task',
  targetId: 'task_1',
  targetTitle: 'Write release notes',
  source: 'web',
  sourceLabel: null,
  summary: '更新任务状态和截止日期',
  changedFields: ['status', 'dueDate'],
  diff: [
    {
      field: 'status',
      label: '状态',
      before: 'today',
      after: 'done',
      beforeLabel: '今日',
      afterLabel: '已完成',
    },
  ],
  metadata: null,
};

describe('ActivityList', () => {
  it('renders empty state when there are no items', () => {
    const html = renderToStaticMarkup(<ActivityList items={[]} emptyText="暂无活动。" />);

    expect(html).toContain('暂无活动。');
  });

  it('renders summary and diff details for activity rows', () => {
    const html = renderToStaticMarkup(<ActivityList items={[sampleItem]} />);

    expect(html).toContain('更新任务');
    expect(html).toContain('Write release notes');
    expect(html).toContain('查看变更明细');
    expect(html).toContain('之前：今日');
    expect(html).toContain('现在：已完成');
  });
});

describe('ActivityTable', () => {
  it('renders tabular columns and diff details', () => {
    const html = renderToStaticMarkup(<ActivityTable items={[sampleItem]} />);

    expect(html).toContain('时间');
    expect(html).toContain('来源');
    expect(html).toContain('Write release notes');
    expect(html).toContain('查看变更明细');
  });
});
