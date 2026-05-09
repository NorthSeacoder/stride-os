import { listQuadrantTasks } from '@/lib/services/task-service';
import { QuadrantsClient } from './quadrants-client';

export default async function QuadrantsPage() {
  const tasks = await listQuadrantTasks();
  return <QuadrantsClient tasks={tasks} />;
}
