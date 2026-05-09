import { listExamples } from '@/lib/services/example-service';
import { ExamplesClient } from './examples-client';

export default async function ExamplesPage() {
  const items = await listExamples();

  return <ExamplesClient items={items} />;
}
