import { listQuadrantBoard, listTaskListsWithCounts } from '@/lib/services/task-service';
import { QuadrantsClient } from './quadrants-client';

export default async function QuadrantsPage() {
  const [board, lists] = await Promise.all([
    listQuadrantBoard({ includeCompleted: true }),
    listTaskListsWithCounts(),
  ]);

  return (
    <div className="-my-1.5 flex h-full min-h-0 flex-col md:-my-2 lg:-my-2.5">
      <QuadrantsClient
        board={board}
        lists={lists.map((list) => ({
          id: list.id,
          name: list.name,
          icon: list.icon,
        }))}
      />
    </div>
  );
}
