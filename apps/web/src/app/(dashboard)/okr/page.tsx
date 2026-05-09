import { listPeriods } from '@/lib/services/okr-service';
import { OkrClient } from './okr-client';

export default async function OkrPage() {
  const periods = await listPeriods();
  return <OkrClient periods={periods as never} />;
}
