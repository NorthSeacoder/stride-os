'use client';

import Link from 'next/link';
import {
  Badge,
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
  SectionHeader,
  SurfacePanel,
} from '@/components/ui';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';

const taskStatusChartConfig = {
  value: {
    label: '任务数',
    color: 'var(--accent-ice)',
  },
} satisfies ChartConfig;

const todayLoadChartConfig = {
  today: {
    label: '今天到期',
    color: 'var(--warning-border)',
  },
  completed: {
    label: '今日完成',
    color: 'var(--accent-ice)',
  },
} satisfies ChartConfig;

const reviewSummaryChartConfig = {
  risk: {
    label: '风险 KR',
    color: 'var(--danger-text)',
  },
  closure: {
    label: '复盘闭环',
    color: 'var(--success-text)',
  },
} satisfies ChartConfig;

export function DashboardTaskStatusChart({
  data,
}: {
  data: ReadonlyArray<{ key: string; label: string; value: number }>;
}) {
  return (
    <SurfacePanel className="p-5 md:p-6">
      <SectionHeader
        eyebrow="状态切片"
        title="任务分布"
        description="按收件箱、已过期、今天到期和已完成查看当前任务结构。"
        action={
          <Link href="/tasks" className="text-sm text-(--text-secondary) transition-colors hover:text-(--text-primary)">
            打开任务
          </Link>
        }
      />
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
        <ChartContainer config={taskStatusChartConfig} className="h-64 min-h-64">
          <BarChart data={data} barGap={12}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
            <ChartTooltip />
            <Bar dataKey="value" radius={[10, 10, 4, 4]} fill="var(--color-value)" />
          </BarChart>
        </ChartContainer>
        <div className="min-w-0 grid gap-3 self-center">
          {data.map((item) => (
            <MetricChip key={item.key} label={item.label} value={String(item.value)} />
          ))}
        </div>
      </div>
    </SurfacePanel>
  );
}

export function DashboardTodayLoadChart({
  data,
}: {
  data: ReadonlyArray<{ key: string; label: string; value: number }>;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
      <ChartContainer config={todayLoadChartConfig} className="h-44 min-h-44">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={40}
            outerRadius={68}
            paddingAngle={4}
          >
            {data.map((item) => (
              <Cell key={item.key} fill={`var(--color-${item.key})`} />
            ))}
          </Pie>
          <ChartTooltip />
        </PieChart>
      </ChartContainer>
      <div className="min-w-0 space-y-3 self-center">
        <div className="rounded-[var(--radius-panel)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-(--text-muted)">今日总负载</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-(--text-primary)">{total}</p>
        </div>
        {data.map((item) => (
          <div key={item.key} className="flex items-center justify-between rounded-[var(--radius-panel)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `var(--color-${item.key})` }} />
              <span className="text-sm text-(--text-secondary)">{item.label}</span>
            </div>
            <span className="text-lg font-semibold text-(--text-primary)">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardReviewClosureChart({
  data,
}: {
  data: ReadonlyArray<{ key: 'risk' | 'closure'; label: string; value: number; detail: string }>;
}) {
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
      <ChartContainer config={reviewSummaryChartConfig} className="h-56 min-h-56">
        <BarChart data={data} layout="vertical" barSize={26}>
          <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.08)" />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
          <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} width={72} />
          <ChartTooltip />
          <Bar dataKey="value" radius={[0, 10, 10, 0]}>
            {data.map((item) => (
              <Cell key={item.key} fill={`var(--color-${item.key})`} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      <div className="min-w-0 space-y-3">
        {data.map((item) => (
          <div key={item.key} className="rounded-[var(--radius-panel)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-(--text-primary)">{item.label}</p>
              <Badge tone={item.key === 'risk' ? 'danger' : 'success'}>{item.value}</Badge>
            </div>
            <p className="mt-2 text-sm text-(--text-secondary)">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.04)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-(--text-muted)">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-(--text-primary)">{value}</p>
    </div>
  );
}
