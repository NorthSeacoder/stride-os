import { listPeriods } from '@/lib/services/okr-service';
import { listDoneTasks, listInboxTasks, listScheduledTasks, listTodayTasks } from '@/lib/services/task-service';
import { TasksClient } from './tasks-client';

export default async function TasksPage() {
  const [today, inbox, scheduled, done, periods] = await Promise.all([
    listTodayTasks(),
    listInboxTasks(),
    listScheduledTasks(),
    listDoneTasks(),
    listPeriods(),
  ]);

  const keyResults = periods.flatMap((period: { objectives: Array<{ title: string; keyResults: Array<{ id: string; title: string }> }> }) =>
    period.objectives.flatMap((objective: { title: string; keyResults: Array<{ id: string; title: string }> }) =>
      objective.keyResults.map((keyResult: { id: string; title: string }) => ({
        id: keyResult.id,
        title: keyResult.title,
        objectiveTitle: objective.title,
      })),
    ),
  );

  return <TasksClient today={today} inbox={inbox} scheduled={scheduled} done={done} keyResults={keyResults} />;
}
