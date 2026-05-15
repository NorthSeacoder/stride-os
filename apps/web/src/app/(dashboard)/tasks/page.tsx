import { listPeriods } from '@/lib/services/okr-service';
import {
  ensureTodayRecurringTasks,
  getTaskDetail,
  listTaskSources,
  listTasksForSource,
} from '@/lib/services/task-service';
import { TasksClient } from './tasks-client';

export default async function TasksPage() {
  await ensureTodayRecurringTasks();

  const [periods, sources] = await Promise.all([
    listPeriods(),
    listTaskSources(),
  ]);

  const keyResults = periods.flatMap((period) =>
    period.objectives.flatMap((objective) =>
      objective.keyResults.map((keyResult) => ({
        id: keyResult.id,
        title: keyResult.title ?? keyResult.id,
        objectiveTitle: objective.title ?? '未命名目标',
      })),
    ),
  );

  const initialSource = sources[0] ?? null;
  const sourceGroupsEntries = await Promise.all(
    sources.map(async (source) => [source.id, await listTasksForSource(source.id)] as const),
  );
  const sourceGroups = Object.fromEntries(sourceGroupsEntries);
  const initialGroups = initialSource ? (sourceGroups[initialSource.id] ?? []) : [];
  const firstTaskId = initialGroups.flatMap((group) => group.items).find((task) => !task.completedAt)?.id
    ?? initialGroups.flatMap((group) => group.items)[0]?.id
    ?? null;
  const initialTaskDetail = firstTaskId ? await getTaskDetail(firstTaskId) : null;

  return (
    <TasksClient
      keyResults={keyResults}
      workspaceData={{
        sources,
        sourceGroups,
        initialSourceId: initialSource?.id ?? null,
        initialGroups,
        initialTaskDetail,
      }}
    />
  );
}
