'use client';

import { DayPicker, type DayPickerProps } from 'react-day-picker';

export function Calendar({
  className = '',
  classNames,
  ...props
}: DayPickerProps) {
  return (
    <DayPicker
      {...props}
      className={className}
      classNames={{
        month_caption: 'mb-2 text-sm font-medium text-(--text-primary)',
        weekdays: 'grid grid-cols-7 text-xs text-(--text-muted)',
        week: 'grid grid-cols-7',
        day: 'size-8 text-sm text-(--text-secondary)',
        day_button:
          'size-8 rounded-[10px] hover:bg-[color:rgba(255,255,255,0.05)] hover:text-(--text-primary)',
        selected: 'rounded-[10px] bg-(--bg-panel-contrast) text-(--text-primary)',
        today: 'text-(--warning-text)',
        nav: 'mb-2 flex justify-end gap-1',
        button_previous:
          'rounded-[10px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] px-2 text-sm text-(--text-secondary) hover:bg-[color:rgba(255,255,255,0.05)] hover:text-(--text-primary)',
        button_next:
          'rounded-[10px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] px-2 text-sm text-(--text-secondary) hover:bg-[color:rgba(255,255,255,0.05)] hover:text-(--text-primary)',
        ...classNames,
      }}
    />
  );
}
