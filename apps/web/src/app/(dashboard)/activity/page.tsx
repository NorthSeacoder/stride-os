import { redirect } from 'next/navigation';
import { ActivityFilters, type ActivityFilterValues } from '@/components/activity/activity-filters';
import { ActivityTable } from '@/components/activity/activity-table';
import { PageIntro, SectionHeader, SurfacePanel } from '@/components/ui';
import { buildActivityHref, buildRawSearchParams } from '@/lib/activity/search-params';
import { listActivity } from '@/lib/services/activity-service';

function readSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawSearchParams = buildRawSearchParams(Object.entries(resolvedSearchParams));
  const sanitizedHref = buildActivityHref('/activity', Object.entries(resolvedSearchParams));

  if (rawSearchParams.toString() !== sanitizedHref.replace(/^\/activity\??/, '')) {
    redirect(sanitizedHref);
  }

  const filters: ActivityFilterValues = {
    source: readSearchParam(resolvedSearchParams.source),
    targetType: readSearchParam(resolvedSearchParams.targetType),
    action: readSearchParam(resolvedSearchParams.action),
    changedField: readSearchParam(resolvedSearchParams.changedField),
    keyword: readSearchParam(resolvedSearchParams.keyword),
  };

  const activity = await listActivity({
    source: filters.source || undefined,
    targetType: filters.targetType || undefined,
    action: filters.action || undefined,
    changedField: filters.changedField || undefined,
    keyword: filters.keyword || undefined,
    limit: 50,
  });

  return (
    <div className="space-y-3">
      <PageIntro
        eyebrow="Activity"
        title="活动记录"
      />

      <ActivityFilters values={filters} />

      <SurfacePanel className="metal-frame instrument-surface p-3.5">
        <SectionHeader
          eyebrow="Table"
          title="最近活动"
        />
        <div className="mt-4">
          <ActivityTable items={activity.items} />
        </div>
      </SurfacePanel>
    </div>
  );
}
