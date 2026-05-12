import Link from 'next/link';
import { Badge, Empty, PageIntro, SectionHeader, SurfacePanel } from '@/components/ui';
import { getKeyResultDetail } from '@/lib/services/okr-service';
import {
  getConfidenceLabel,
  getKeyResultStatusLabel,
  getKeyResultTypeLabel,
  getTaskStatusLabel,
} from '@/lib/presentation/labels';
import { CheckInForm } from './check-in-form';

export default async function KeyResultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const keyResult = await getKeyResultDetail(id);

  if (!keyResult) {
    return (
      <div className="space-y-4">
        <Link href="/okr" className="text-sm text-(--text-secondary) hover:text-(--text-primary)">
          返回 OKR
        </Link>
        <Empty text="未找到这个关键结果。" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow={`${keyResult.objective.period.name} / ${keyResult.objective.title}`}
        title={keyResult.title}
        description="这里汇总 KR 的状态、关联任务和 check-in 历史。"
        action={
          <Link href="/okr" className="rounded-[var(--radius-compact)] border border-(--border-hairline) px-3 py-2 text-sm text-(--text-secondary) transition-colors hover:border-(--border-glow) hover:text-(--text-primary)">
            返回 OKR
          </Link>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <InspectorMetric label="类型" value={getKeyResultTypeLabel(keyResult.type)} />
        <InspectorMetric label="状态" value={getKeyResultStatusLabel(keyResult.status)} />
        <InspectorMetric label="信心" value={getConfidenceLabel(keyResult.progress?.confidence)} />
        <InspectorMetric label="进度" value={String(keyResult.progress?.progressValue ?? '暂无')} />
      </div>

      <SurfacePanel className="metal-frame instrument-surface p-5 md:p-6">
        <SectionHeader
          eyebrow="Execution Context"
          title="关联任务"
          description="任务流程中关联到这个 KR 的事项会显示在这里，作为执行材料。"
        />
        <div className="mt-4 space-y-3">
          {keyResult.tasks.length === 0 ? (
            <Empty text="这个 KR 还没有关联任务。" />
          ) : (
            keyResult.tasks.map((task: { id: string; title: string; status: string; dueDate: string | null; notes: string | null; description?: string | null }) => (
              <div key={task.id} className="metal-frame rounded-[16px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-(--text-primary)">{task.title}</p>
                  <Badge>{getTaskStatusLabel(task.status)}</Badge>
                  {task.dueDate && <Badge>截止 {task.dueDate}</Badge>}
                </div>
                {(task.description || task.notes) && <p className="mt-2 text-sm text-(--text-secondary)">{task.description || task.notes}</p>}
              </div>
            ))
          )}
        </div>
      </SurfacePanel>

      <CheckInForm keyResultId={keyResult.id} />

      <SurfacePanel className="metal-frame instrument-surface p-5 md:p-6">
        <SectionHeader
          eyebrow="History"
          title="Check-in 历史"
        />
        <div className="mt-4 space-y-3">
          {keyResult.checkIns.length === 0 ? (
            <Empty text="还没有 check-in 记录。" />
          ) : (
            keyResult.checkIns.map((checkIn: { id: string; confidence: string; progressValue: number | null; summary: string | null; blockers: string | null; nextActions: string | null; createdAt: Date }) => (
              <div key={checkIn.id} className="metal-frame rounded-[16px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-4">
                <div className="flex flex-wrap gap-3 text-sm text-(--text-secondary)">
                  <span>{String(checkIn.createdAt).slice(0, 10)}</span>
                  <span>信心 {getConfidenceLabel(checkIn.confidence)}</span>
                  <span>进度 {checkIn.progressValue ?? '暂无'}</span>
                </div>
                {checkIn.summary && <p className="mt-2 text-sm text-(--text-primary)">{checkIn.summary}</p>}
                {checkIn.blockers && <p className="mt-1 text-sm text-(--text-secondary)">阻塞项：{checkIn.blockers}</p>}
                {checkIn.nextActions && <p className="mt-1 text-sm text-(--text-secondary)">下一步：{checkIn.nextActions}</p>}
              </div>
            ))
          )}
        </div>
      </SurfacePanel>
    </div>
  );
}

function InspectorMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metal-frame rounded-[16px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">{label}</p>
      <p className="mt-3 text-lg font-semibold tracking-[-0.02em] text-(--text-primary)">{value}</p>
    </div>
  );
}
