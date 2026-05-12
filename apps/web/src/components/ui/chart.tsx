'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from 'recharts';

export type ChartConfig = Record<
  string,
  {
    label?: string;
    color?: string;
  }
>;

const ChartContext = React.createContext<ChartConfig | null>(null);

export function useChartConfig() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error('Chart components must be used inside ChartContainer.');
  }

  return context;
}

export function ChartContainer({
  config,
  className = '',
  children,
}: {
  config: ChartConfig;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ChartContext.Provider value={config}>
      <div
        className={`chart-surface min-w-0 ${className}`.trim()}
        style={{ minWidth: 0, ...buildChartStyle(config) }}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export function ChartTooltip({
  content,
}: {
  content?: React.ComponentType<TooltipContentProps<number, string>>;
}) {
  return (
    <Tooltip
      cursor={false}
      content={(props) =>
        content
          ? React.createElement(content, props as TooltipContentProps<number, string>)
          : React.createElement(ChartTooltipContent, props as TooltipContentProps<number, string>)
      }
    />
  );
}

export function ChartTooltipContent({
  active,
  payload,
  label,
}: TooltipContentProps<number, string>) {
  const config = React.useContext(ChartContext);

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-[14px] border border-(--border-hairline) bg-(--bg-surface-2) px-3 py-2 shadow-xl">
      {label ? <p className="mb-2 text-xs uppercase tracking-[0.18em] text-(--text-muted)">{label}</p> : null}
      <div className="space-y-1.5">
        {payload.map((item) => {
          const key = String(item.dataKey ?? item.name ?? '');
          const color = item.color ?? config?.[key]?.color ?? 'var(--accent-ice)';
          const itemLabel = config?.[key]?.label ?? item.name ?? key;

          return (
            <div key={key} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 text-(--text-secondary)">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span>{itemLabel}</span>
              </div>
              <span className="font-medium text-(--text-primary)">{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildChartStyle(config: ChartConfig) {
  return Object.fromEntries(
    Object.entries(config)
      .filter(([, item]) => item.color)
      .map(([key, item]) => [`--color-${key}`, item.color]),
  ) as React.CSSProperties;
}
