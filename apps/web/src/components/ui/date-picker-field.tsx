'use client';

import { Field } from '@base-ui/react/field';
import { Popover } from '@base-ui/react/popover';
import { useEffect, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { Button } from './button';

type DatePickerFieldProps = {
  name: string;
  label: string;
  defaultValue?: string | null;
  allowClear?: boolean;
  error?: string;
  description?: string;
  onValueChange?: (value: string) => void;
};

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value?: string | null) {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

export function DatePickerField({
  name,
  label,
  defaultValue = '',
  allowClear = true,
  error,
  description,
  onValueChange,
}: DatePickerFieldProps) {
  const [value, setValue] = useState(defaultValue ?? '');
  const selected = parseDate(value);

  useEffect(() => {
    setValue(defaultValue ?? '');
  }, [defaultValue]);

  function setDate(nextValue: string) {
    setValue(nextValue);
    onValueChange?.(nextValue);
  }

  return (
    <Field.Root className="block">
      <Field.Label className="mb-1 block text-sm text-[var(--text-secondary)]">{label}</Field.Label>
      <input type="hidden" name={name} value={value} />
      <Popover.Root>
        <div className="flex items-start gap-2">
          <Popover.Trigger
            render={
              <Button variant="secondary" className="flex h-10 min-h-10 w-full items-center overflow-hidden bg-[var(--bg-canvas)] px-3 text-left" />
            }
          >
            <span className="block truncate">{value || '选择日期'}</span>
          </Popover.Trigger>
          {allowClear && value && (
            <Button
              type="button"
              onClick={() => setDate('')}
              variant="secondary"
              className="h-10 shrink-0 px-3"
            >
              清空
            </Button>
          )}
        </div>
        <Popover.Portal>
          <Popover.Positioner className="z-50">
            <Popover.Popup className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 shadow-xl">
              <DayPicker
                mode="single"
                selected={selected}
                onSelect={(date) => {
                  if (date) setDate(formatDate(date));
                }}
                classNames={{
                  month_caption: 'mb-2 text-sm font-medium text-[var(--text-primary)]',
                  weekdays: 'grid grid-cols-7 text-xs text-[var(--text-muted)]',
                  week: 'grid grid-cols-7',
                  day: 'size-8 text-sm text-[var(--text-secondary)]',
                  day_button: 'size-8 rounded-md hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
                  selected: 'rounded-md bg-[var(--bg-panel-contrast)] text-[var(--text-primary)]',
                  today: 'text-[var(--warning-text)]',
                  nav: 'mb-2 flex justify-end gap-1',
                  button_previous:
                    'rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
                  button_next:
                    'rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
                }}
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      {description && <Field.Description className="mt-1 text-xs text-[var(--text-muted)]">{description}</Field.Description>}
      {error && <Field.Error className="mt-1 text-xs text-[var(--danger-text)]">{error}</Field.Error>}
    </Field.Root>
  );
}
