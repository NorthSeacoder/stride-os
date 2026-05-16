import Link from 'next/link';
import { ActivityList } from '@/components/activity/activity-list';
import { Badge, Empty, PageIntro, SectionHeader, SurfacePanel } from '@/components/ui';
import { listActivity } from '@/lib/services/activity-service';
import { getKeyResultDetail } from '@/lib/services/okr-service';
import {
  getKeyResultStatusLabel,
  getTaskStatusLabel,
} from '@/lib/presentation/labels';
import { CheckInForm } from './check-in-form';
import { EditKeyResultForm } from './edit-key-result-form';

export default async function KeyResultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [keyResult, activity] = await Promise.all([
    getKeyResultDetail(id),
    listActivity({
      targetType: 'key_result',
      targetId: id,
      limit: 20,
    }),
  ]);

  if (!keyResult) {
    return (
      <div className="space-y-3">
        <Link href="/okr" className="text-sm text-(--text-secondary) hover:text-(--text-primary)">
          返回 OKR
        </Link>
        <Empty text="未找到这个关键结果。" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageIntro
        eyebrow={`${keyResult.objective.period.name} / ${keyResult.objective.title}`}
        title={keyResult.title}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <EditKeyResultForm keyResult={keyResult} />
            <Link href="/okr" className="rounded-[var(--radius-compact)] border border-(--border-hairline) px-3 py-2 text-sm text-(--text-secondary) transition-colors hover:border-(--border-glow) hover:text-(--text-primary)">
              返回 OKR
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <InspectorMetric label="状态" value={getKeyResultStatusLabel(keyResult.status)} />
        <InspectorMetric
          label="承诺任务"
          value={keyResult.taskProgress?.hasCommittedTasks
            ? `${keyResult.taskProgress.completedCommittedTaskCount}/${keyResult.taskProgress.committedTaskCount}`
            : '暂无承诺任务'}
        />
        <InspectorMetric
          label="最近更新"
          value={keyResult.latestCheckIn?.hasCheckIn && keyResult.latestCheckIn.updatedAt
            ? String(keyResult.latestCheckIn.updatedAt).slice(0, 10)
            : '暂无 check-in'}
        />
      </div>

      <SurfacePanel className="metal-frame instrument-surface p-3.5">
        <SectionHeader
          eyebrow="Current Definition"
          title="KR 当前定义"
        />
        <div className="mt-4 space-y-3">
          <div className="metal-frame rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.025)] p-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">结果定义</p>
            <p className="mt-2 text-base font-semibold text-(--text-primary)">{keyResult.title}</p>
            {keyResult.description && (
              <p className="mt-2 text-sm leading-6 text-(--text-secondary)">{keyResult.description}</p>
            )}
          </div>
        </div>
      </SurfacePanel>

      <SurfacePanel className="metal-frame instrument-surface p-3.5">
        <SectionHeader
          eyebrow="Auto Summary"
          title="任务摘要与最近回顾"
        />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="metal-frame rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.025)] p-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">自动任务摘要</p>
            {keyResult.taskProgress?.hasCommittedTasks ? (
              <>
                <p className="mt-2 text-base font-semibold text-(--text-primary)">
                  已完成 {keyResult.taskProgress.completedCommittedTaskCount} / 已承诺 {keyResult.taskProgress.committedTaskCount}
                </p>
                <p className="mt-2 text-sm text-(--text-secondary)">未完成 {keyResult.taskProgress.openCommittedTaskCount} 项</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-(--text-secondary)">暂无承诺任务，当前只有任务关联。</p>
            )}
          </div>
          <div className="metal-frame rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.025)] p-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">最近 check-in</p>
            {keyResult.latestCheckIn?.hasCheckIn ? (
              <>
                {keyResult.latestCheckIn.summary && (
                  <p className="mt-2 text-sm text-(--text-primary)">{keyResult.latestCheckIn.summary}</p>
                )}
                {keyResult.latestCheckIn.blockers && <p className="mt-2 text-sm text-(--text-secondary)">阻塞项：{keyResult.latestCheckIn.blockers}</p>}
                {keyResult.latestCheckIn.nextActions && <p className="mt-1 text-sm text-(--text-secondary)">下一步：{keyResult.latestCheckIn.nextActions}</p>}
              </>
            ) : (
              <p className="mt-2 text-sm text-(--text-secondary)">暂无 check-in。</p>
            )}
          </div>
        </div>
      </SurfacePanel>

      <SurfacePanel className="metal-frame instrument-surface p-3.5">
        <SectionHeader
          eyebrow="Execution Context"
          title="关联任务"
        />
        <div className="mt-4 space-y-3">
          {keyResult.tasks.length === 0 ? (
            <Empty text="这个 KR 还没有关联任务。" />
          ) : (
            keyResult.tasks.map((task: { id: string; title: string; status: string; dueDate: string | null; notes: string | null; description?: string | null; keyResultLinks?: Array<{ keyResult: { id: string }; countsTowardCommitment?: boolean | null }> }) => (
              <div key={task.id} className="metal-frame rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-(--text-primary)">{task.title}</p>
                  <Badge>{getTaskStatusLabel(task.status)}</Badge>
                  {task.dueDate && <Badge>截止 {task.dueDate}</Badge>}
                  {task.keyResultLinks?.find((link) => link.keyResult.id === keyResult.id)?.countsTowardCommitment
                    ? <Badge>纳入承诺</Badge>
                    : <Badge>仅关联</Badge>}
                </div>
                {(task.description || task.notes) && <p className="mt-2 text-sm text-(--text-secondary)">{task.description || task.notes}</p>}
              </div>
            ))
          )}
        </div>
      </SurfacePanel>

      <CheckInForm keyResultId={keyResult.id} />

      <SurfacePanel className="metal-frame instrument-surface p-3.5">
        <SectionHeader
          eyebrow="History"
          title="Check-in 历史"
        />
        <div className="mt-4 space-y-3">
          {keyResult.checkIns.length === 0 ? (
            <Empty text="还没有 check-in 记录。" />
          ) : (
            keyResult.checkIns.map((checkIn: { id: string; summary: string | null; blockers: string | null; nextActions: string | null; createdAt: Date }) => (
              <div key={checkIn.id} className="metal-frame rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-3">
                <div className="flex flex-wrap gap-3 text-sm text-(--text-secondary)">
                  <span>{String(checkIn.createdAt).slice(0, 10)}</span>
                </div>
                {checkIn.summary && <p className="mt-2 text-sm text-(--text-primary)">{checkIn.summary}</p>}
                {checkIn.blockers && <p className="mt-1 text-sm text-(--text-secondary)">阻塞项：{checkIn.blockers}</p>}
                {checkIn.nextActions && <p className="mt-1 text-sm text-(--text-secondary)">下一步：{checkIn.nextActions}</p>}
              </div>
            ))
          )}
        </div>
      </SurfacePanel>

      <SurfacePanel className="metal-frame instrument-surface p-3.5">
        <SectionHeader
          eyebrow="Activity"
          title="活动轨迹"
        />
        <div className="mt-4">
          <ActivityList items={activity.items} emptyText="这个 KR 还没有活动记录。" />
        </div>
      </SurfacePanel>
    </div>
  );
}

function InspectorMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metal-frame rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.025)] p-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">{label}</p>
      <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-(--text-primary)">{value}</p>
    </div>
  );
}
