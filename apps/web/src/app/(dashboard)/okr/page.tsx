import { listPeriods } from '@/lib/services/okr-service';
import { OkrClient } from './okr-client';

export default async function OkrPage() {
  const periods = await listPeriods();
  return (
    <div className="-my-1.5 flex h-full min-h-0 flex-col md:-my-2 lg:-my-2.5">
      <OkrClient periods={periods as never} />
    </div>
  );
}
