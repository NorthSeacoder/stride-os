'use client';

import { Field } from '@base-ui/react/field';
import { Popover } from '@base-ui/react/popover';
import { useEffect, useState } from 'react';
import { Button } from './button';
import { Calendar } from './calendar';

type DatePickerFieldProps = {
  name: string;
  label: string;
  value?: string | null;
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
  value,
  defaultValue = '',
  allowClear = true,
  error,
  description,
  onValueChange,
}: DatePickerFieldProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const currentValue = isControlled ? (value ?? '') : internalValue;
  const selected = parseDate(currentValue);

  useEffect(() => {
    if (!isControlled) {
      setInternalValue(defaultValue ?? '');
    }
  }, [defaultValue, isControlled]);

  function setDate(nextValue: string) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  }

  return (
      <Field.Root className="block">
      <Field.Label className="mb-1 block text-sm text-(--text-secondary)">{label}</Field.Label>
      <input type="hidden" name={name} value={currentValue} />
      <Popover.Root>
        <div className="flex items-start gap-2">
          <Popover.Trigger
            render={
              <Button variant="secondary" className="flex h-10 min-h-10 w-full items-center overflow-hidden bg-(--bg-canvas) px-3 text-left" />
            }
          >
            <span className="block truncate">{currentValue || '选择日期'}</span>
          </Popover.Trigger>
          {allowClear && currentValue && (
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
            <Popover.Popup className="metal-frame rounded-[var(--radius-compact)] border border-(--border-hairline) bg-(--bg-surface-2) p-3 shadow-xl">
              <Calendar
                mode="single"
                selected={selected}
                onSelect={(date) => {
                  if (date) setDate(formatDate(date));
                }}
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      {description && <Field.Description className="mt-1 text-xs text-(--text-muted)">{description}</Field.Description>}
      {error && <Field.Error className="mt-1 text-xs text-(--danger-text)">{error}</Field.Error>}
    </Field.Root>
  );
}
