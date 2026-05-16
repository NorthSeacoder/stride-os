'use client';

import * as React from 'react';
import {
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
  const [mounted, setMounted] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted || !containerRef.current) {
      return;
    }

    const element = containerRef.current;
    const updateSize = () => {
      const nextWidth = Math.floor(element.clientWidth);
      const nextHeight = Math.floor(element.clientHeight);
      setSize((current) => (
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight }
      ));
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(element);
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [mounted]);

  const chartChild = React.useMemo(() => {
    if (!React.isValidElement(children) || size.width <= 0 || size.height <= 0) {
      return null;
    }

    return React.cloneElement(children as React.ReactElement<{ width?: number; height?: number }>, {
      width: size.width,
      height: size.height,
    });
  }, [children, size.height, size.width]);

  return (
    <ChartContext.Provider value={config}>
      <div
        ref={containerRef}
        className={`chart-surface min-h-0 min-w-0 ${className}`.trim()}
        style={{ width: '100%', minWidth: 0, minHeight: 160, ...buildChartStyle(config) }}
      >
        {mounted ? chartChild : null}
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
