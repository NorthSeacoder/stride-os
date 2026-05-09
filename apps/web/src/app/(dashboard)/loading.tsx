import { Loading } from '@/components/ui';

export default function DashboardLoading() {
  return (
    <div className="px-6 py-6">
      <Loading text="Loading workspace..." />
    </div>
  );
}
