'use client';

import Link from 'next/link';
import { useActionState, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  DatePickerField,
  Empty,
  ErrorAlert,
  Modal,
  PageIntro,
  SectionHeader,
  SelectField,
  SurfacePanel,
  TextareaField,
  TextField,
} from '@/components/ui';
import {
  getKeyResultStatusLabel,
  getPeriodStatusLabel,
  getPeriodTypeLabel,
} from '@/lib/presentation/labels';
import {
  archiveObjectiveAction,
  archivePeriodAction,
  createKeyResultAction as createKeyResultServerAction,
  createObjectiveAction as createObjectiveServerAction,
  createPeriodAction as createPeriodServerAction,
  updateObjectiveAction,
  updatePeriodAction,
  type OkrActionState,
} from './actions';

type KeyResultView = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  taskProgress: {
    committedTaskCount: number;
    completedCommittedTaskCount: number;
    openCommittedTaskCount: number;
    hasCommittedTasks: boolean;
  };
  latestCheckIn: {
    hasCheckIn: boolean;
    summary: string | null;
    blockers: string | null;
    nextActions: string | null;
    updatedAt: string | Date | null;
  };
};

type ObjectiveView = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  status?: string;
  keyResults: KeyResultView[];
};

type PeriodView = {
  id: string;
  name: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  objectives: ObjectiveView[];
};

const initialState: OkrActionState = { error: '' };

export function OkrClient({ periods }: { periods: PeriodView[] }) {
  const [activePeriodId, setActivePeriodId] = useState<string>(periods[0]?.id ?? '');
  const [activeObjectiveId, setActiveObjectiveId] = useState<string>('');
  const [createPeriodOpen, setCreatePeriodOpen] = useState(false);
  const [editPeriodOpen, setEditPeriodOpen] = useState(false);
  const [archivePeriodOpen, setArchivePeriodOpen] = useState(false);
  const [createObjectiveOpen, setCreateObjectiveOpen] = useState(false);
  const [editObjectiveOpen, setEditObjectiveOpen] = useState(false);
  const [archiveObjectiveOpen, setArchiveObjectiveOpen] = useState(false);
  const [createKrOpen, setCreateKrOpen] = useState(false);

  const [createPeriodState, createPeriodAction] = useActionState(createPeriodServerAction, initialState);
  const [editPeriodState, runEditPeriodAction] = useActionState(updatePeriodAction, initialState);
  const [archivePeriodState, runArchivePeriodAction] = useActionState(archivePeriodAction, initialState);
  const [createObjectiveState, runCreateObjectiveAction] = useActionState(createObjectiveServerAction, initialState);
  const [editObjectiveState, runEditObjectiveAction] = useActionState(updateObjectiveAction, initialState);
  const [archiveObjectiveState, runArchiveObjectiveAction] = useActionState(archiveObjectiveAction, initialState);
  const [createKrState, runCreateKrAction] = useActionState(createKeyResultServerAction, initialState);

  useEffect(() => {
    if (periods.length && !periods.some((period) => period.id === activePeriodId)) {
      setActivePeriodId(periods[0]?.id ?? '');
    }
  }, [periods, activePeriodId]);

  const activePeriod = periods.find((period) => period.id === activePeriodId) ?? periods[0] ?? null;

  useEffect(() => {
    const objectiveId = activePeriod?.objectives[0]?.id ?? '';
    if (!activePeriod) {
      setActiveObjectiveId('');
      return;
    }
    if (!activePeriod.objectives.some((objective) => objective.id === activeObjectiveId)) {
      setActiveObjectiveId(objectiveId);
    }
  }, [activePeriod, activeObjectiveId]);

  const activeObjective = activePeriod?.objectives.find((objective) => objective.id === activeObjectiveId)
    ?? activePeriod?.objectives[0]
    ?? null;

  useEffect(() => {
    if (!createPeriodState.error) setCreatePeriodOpen(false);
  }, [createPeriodState]);
  useEffect(() => {
    if (!editPeriodState.error) setEditPeriodOpen(false);
  }, [editPeriodState]);
  useEffect(() => {
    if (!archivePeriodState.error) setArchivePeriodOpen(false);
  }, [archivePeriodState]);
  useEffect(() => {
    if (!createObjectiveState.error) setCreateObjectiveOpen(false);
  }, [createObjectiveState]);
  useEffect(() => {
    if (!editObjectiveState.error) setEditObjectiveOpen(false);
  }, [editObjectiveState]);
  useEffect(() => {
    if (!archiveObjectiveState.error) setArchiveObjectiveOpen(false);
  }, [archiveObjectiveState]);
  useEffect(() => {
    if (!createKrState.error) setCreateKrOpen(false);
  }, [createKrState]);

  const periodOptions = useMemo(() => periods.map((period) => ({
    value: period.id,
    label: `${period.name} · ${getPeriodTypeLabel(period.type)}`,
  })), [periods]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      <PageIntro title="OKR" />

      {activePeriod && (
        <SurfacePanel className="metal-frame instrument-surface px-3 py-2">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full min-w-0 lg:max-w-[360px]">
              <SelectField
                name="activePeriod"
                label="当前周期"
                value={activePeriod.id}
                onValueChange={setActivePeriodId}
                options={periodOptions}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="primary" onClick={() => setCreatePeriodOpen(true)}>
                新建周期
              </Button>
              <div className="px-1 text-xs text-(--text-muted)">
                {activePeriod.startDate} 至 {activePeriod.endDate}
              </div>
              <Button type="button" variant="secondary" onClick={() => setEditPeriodOpen(true)}>
                编辑周期
              </Button>
              <Button type="button" variant="ghost" onClick={() => setArchivePeriodOpen(true)}>
                归档周期
              </Button>
            </div>
          </div>
        </SurfacePanel>
      )}

      {!activePeriod && (
        <SurfacePanel className="metal-frame instrument-surface px-3 py-2">
          <div className="flex justify-end">
            <Button type="button" variant="primary" onClick={() => setCreatePeriodOpen(true)}>
              新建周期
            </Button>
          </div>
        </SurfacePanel>
      )}

      {!activePeriod ? (
        <Empty text="还没有周期。先创建一个周期。" />
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
          <SurfacePanel className="metal-frame instrument-surface flex min-h-0 flex-col p-3">
            <SectionHeader
              title="目标列表"
              description={`${activePeriod.name} · ${activePeriod.startDate} 至 ${activePeriod.endDate}`}
              action={
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setCreateObjectiveOpen(true)}
                  className="h-10 min-h-10 w-10 min-w-10 rounded-full border-(--border-hairline) bg-[color:rgba(255,255,255,0.04)] px-0 text-(--text-primary) hover:bg-[color:rgba(255,255,255,0.08)]"
                  aria-label="新增目标"
                  title="新增目标"
                >
                  <PlusIcon />
                </Button>
              }
            />
            <div className="mt-2.5 min-h-0 flex-1 space-y-1.5 border-t border-(--border-hairline) pt-2.5 overflow-y-auto pr-1">
              {activePeriod.objectives.length === 0 ? (
                <Empty text="这个周期下还没有目标。" />
              ) : (
                activePeriod.objectives.map((objective) => {
                  const selected = objective.id === activeObjective?.id;
                  const keyResultCount = objective.keyResults.length;
                  return (
                    <button
                      key={objective.id}
                      type="button"
                      onClick={() => setActiveObjectiveId(objective.id)}
                      className={`metal-frame block w-full rounded-[var(--radius-compact)] border px-3 py-2.5 text-left transition-colors ${
                        selected
                          ? 'border-(--border-glow) bg-[color:rgba(180,204,255,0.10)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                          : 'border-(--border-hairline) bg-[color:rgba(255,255,255,0.02)] hover:border-(--border-glow) hover:bg-[color:rgba(255,255,255,0.04)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-(--text-muted)">Objective</p>
                          <p className="mt-1.5 truncate text-sm font-semibold text-(--text-primary)">{objective.title}</p>
                        </div>
                        <div className="shrink-0">
                          <Badge>{keyResultCount} KR</Badge>
                        </div>
                      </div>
                      {objective.description && (
                        <p className="mt-1.5 line-clamp-1 text-sm leading-5 text-(--text-secondary)">{objective.description}</p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </SurfacePanel>

          <SurfacePanel className="metal-frame instrument-surface flex min-h-0 flex-col p-3">
            {!activeObjective ? (
              <Empty text="请选择一个目标。" />
            ) : (
              <>
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">
                      {getPeriodTypeLabel(activePeriod.type)} / {getPeriodStatusLabel(activePeriod.status)}
                    </p>
                    <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-(--text-primary)">
                      {activeObjective.title}
                    </h2>
                    {activeObjective.description && (
                      <p className="mt-1.5 text-sm text-(--text-secondary)">{activeObjective.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="secondary" onClick={() => setEditObjectiveOpen(true)}>
                      编辑
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setArchiveObjectiveOpen(true)}>
                      归档
                    </Button>
                    <Button type="button" variant="primary" onClick={() => setCreateKrOpen(true)}>
                      新增 KR
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <InspectorMetric label="KR 数" value={String(activeObjective.keyResults.length)} />
                  <InspectorMetric
                    label="活跃 KR"
                    value={String(activeObjective.keyResults.filter((item) => item.status === 'active' || item.status === 'at_risk').length)}
                  />
                  <InspectorMetric
                    label="已 check-in"
                    value={String(activeObjective.keyResults.filter((item) => item.latestCheckIn.hasCheckIn).length)}
                  />
                </div>

                <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {activeObjective.keyResults.length === 0 ? (
                    <Empty text="这个目标下还没有关键结果。" />
                  ) : (
                    activeObjective.keyResults.map((keyResult) => (
                      <Link
                        key={keyResult.id}
                        href={`/okr/${keyResult.id}`}
                        className="metal-frame block rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.025)] px-3 py-3 transition-colors hover:border-(--border-glow) hover:bg-[color:rgba(255,255,255,0.05)]"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-(--text-primary)">{keyResult.title}</p>
                            {keyResult.description && (
                              <p className="mt-1.5 text-sm leading-6 text-(--text-secondary)">{keyResult.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge>{getKeyResultStatusLabel(keyResult.status)}</Badge>
                              <Badge>{formatTaskProgressBadge(keyResult.taskProgress)}</Badge>
                              <Badge>
                                {keyResult.latestCheckIn.hasCheckIn ? '已 check-in' : '暂无 check-in'}
                              </Badge>
                            </div>
                          </div>
                          <div className="min-w-[128px] text-sm text-(--text-secondary)">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-(--text-muted)">最近更新</p>
                            <p className="mt-2">
                              {keyResult.latestCheckIn.hasCheckIn
                                ? String(keyResult.latestCheckIn.updatedAt).slice(0, 10)
                                : '暂无 check-in'}
                            </p>
                            {keyResult.latestCheckIn.hasCheckIn && keyResult.latestCheckIn.summary && (
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-(--text-muted)">
                                {keyResult.latestCheckIn.summary}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </>
            )}
          </SurfacePanel>
        </div>
      )}

      <PeriodModal
        mode="create"
        open={createPeriodOpen}
        onOpenChange={setCreatePeriodOpen}
        action={createPeriodAction}
        error={createPeriodState.error}
      />
      {activePeriod && (
        <>
          <PeriodModal
            mode="edit"
            open={editPeriodOpen}
            onOpenChange={setEditPeriodOpen}
            action={runEditPeriodAction}
            error={editPeriodState.error}
            period={activePeriod}
          />
          <ArchiveModal
            open={archivePeriodOpen}
            onOpenChange={setArchivePeriodOpen}
            title="归档周期"
            description={`确认归档「${activePeriod.name}」？`}
            action={runArchivePeriodAction}
            hiddenName="periodId"
            hiddenValue={activePeriod.id}
            error={archivePeriodState.error}
            confirmLabel="确认归档周期"
          />
        </>
      )}
      {activePeriod && (
        <ObjectiveModal
          mode="create"
          open={createObjectiveOpen}
          onOpenChange={setCreateObjectiveOpen}
          action={runCreateObjectiveAction}
          error={createObjectiveState.error}
          periodId={activePeriod.id}
        />
      )}
      {activeObjective && (
        <>
          <ObjectiveModal
            mode="edit"
            open={editObjectiveOpen}
            onOpenChange={setEditObjectiveOpen}
            action={runEditObjectiveAction}
            error={editObjectiveState.error}
            objective={activeObjective}
          />
          <ArchiveModal
            open={archiveObjectiveOpen}
            onOpenChange={setArchiveObjectiveOpen}
            title="归档目标"
            description={`确认归档目标「${activeObjective.title}」？`}
            action={runArchiveObjectiveAction}
            hiddenName="objectiveId"
            hiddenValue={activeObjective.id}
            error={archiveObjectiveState.error}
            confirmLabel="确认归档目标"
          />
          <CreateKeyResultModal
            open={createKrOpen}
            onOpenChange={setCreateKrOpen}
            action={runCreateKrAction}
            error={createKrState.error}
            objectiveId={activeObjective.id}
          />
        </>
      )}
    </div>
  );
}

function InspectorMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metal-frame rounded-[var(--radius-compact)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.025)] px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-(--text-primary)">{value}</p>
    </div>
  );
}

function formatTaskProgressBadge(taskProgress: KeyResultView['taskProgress']) {
  if (!taskProgress.hasCommittedTasks) {
    return '暂无承诺任务';
  }

  return `任务 ${taskProgress.completedCommittedTaskCount}/${taskProgress.committedTaskCount}`;
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-[18px] w-[18px]">
      <path d="M10 4.25v11.5M4.25 10h11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PeriodModal({
  mode,
  open,
  onOpenChange,
  action,
  error,
  period,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: (formData: FormData) => void;
  error: string;
  period?: PeriodView;
}) {
  const [type, setType] = useState(period?.type ?? 'year');
  const [startDate, setStartDate] = useState(period?.startDate ?? '');
  const [endDate, setEndDate] = useState(period?.endDate ?? '');

  useEffect(() => {
    if (open) {
      setType(period?.type ?? 'year');
      setStartDate(period?.startDate ?? '');
      setEndDate(period?.endDate ?? '');
    }
  }, [open, period]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? '新建周期' : '编辑周期'}
    >
      <form action={action} className="space-y-3">
        {mode === 'edit' && period && <input type="hidden" name="periodId" value={period.id} />}
        {error && <ErrorAlert message={error} />}
        <TextField name="name" label="周期名称" defaultValue={period?.name ?? ''} required />
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField
            name="type"
            label="类型"
            value={type}
            onValueChange={setType}
            options={[
              { value: 'year', label: '年度' },
              { value: 'quarter', label: '季度' },
              { value: 'month', label: '月度' },
              { value: 'custom', label: '自定义' },
            ]}
          />
          <SelectField
            name="status"
            label="状态"
            defaultValue={period?.status ?? 'active'}
            options={[
              { value: 'active', label: '活跃' },
              { value: 'archived', label: '归档' },
            ]}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <DatePickerField name="startDate" label="开始日期" value={startDate} onValueChange={setStartDate} allowClear={false} />
          <DatePickerField name="endDate" label="结束日期" value={endDate} onValueChange={setEndDate} allowClear={false} />
        </div>
        <div className="flex justify-end pt-1">
          <Button type="submit" variant="primary">{mode === 'create' ? '创建周期' : '保存周期'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ObjectiveModal({
  mode,
  open,
  onOpenChange,
  action,
  error,
  periodId,
  objective,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: (formData: FormData) => void;
  error: string;
  periodId?: string;
  objective?: ObjectiveView;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? '新增目标' : '编辑目标'}
    >
      <form action={action} className="space-y-3">
        {mode === 'create' && periodId && <input type="hidden" name="periodId" value={periodId} />}
        {mode === 'edit' && objective && <input type="hidden" name="objectiveId" value={objective.id} />}
        <input type="hidden" name="sortOrder" value={String(objective?.sortOrder ?? 0)} />
        {error && <ErrorAlert message={error} />}
        <TextField name="title" label="目标标题" defaultValue={objective?.title ?? ''} required />
        <TextareaField name="description" label="描述" rows={3} defaultValue={objective?.description ?? ''} />
        <SelectField
          name="status"
          label="状态"
          defaultValue={objective?.status ?? 'active'}
          options={[
            { value: 'active', label: '活跃' },
            { value: 'done', label: '完成' },
            { value: 'archived', label: '归档' },
          ]}
        />
        <div className="flex justify-end pt-1">
          <Button type="submit" variant="primary">{mode === 'create' ? '创建目标' : '保存目标'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function CreateKeyResultModal({
  open,
  onOpenChange,
  action,
  error,
  objectiveId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: (formData: FormData) => void;
  error: string;
  objectiveId: string;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="新增 KR"
    >
      <form action={action} className="space-y-3">
        <input type="hidden" name="objectiveId" value={objectiveId} />
        {error && <ErrorAlert message={error} />}
        <TextField name="title" label="KR 标题" required />
        <TextareaField name="description" label="结果描述" rows={3} />
        <SelectField
          name="status"
          label="状态"
          defaultValue="active"
          options={[
            { value: 'active', label: '活跃' },
            { value: 'at_risk', label: '有风险' },
            { value: 'done', label: '完成' },
            { value: 'archived', label: '归档' },
          ]}
        />
        <div className="flex justify-end pt-1">
          <Button type="submit" variant="primary">创建 KR</Button>
        </div>
      </form>
    </Modal>
  );
}

function ArchiveModal({
  open,
  onOpenChange,
  title,
  description,
  action,
  hiddenName,
  hiddenValue,
  error,
  confirmLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  action: (formData: FormData) => void;
  hiddenName: string;
  hiddenValue: string;
  error: string;
  confirmLabel: string;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <form action={action} className="space-y-3">
        <input type="hidden" name={hiddenName} value={hiddenValue} />
        {error && <ErrorAlert message={error} />}
        <div className="flex justify-end pt-1">
          <Button type="submit" variant="primary">{confirmLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}
