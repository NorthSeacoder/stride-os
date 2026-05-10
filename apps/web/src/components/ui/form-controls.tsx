'use client';

import { Checkbox } from '@base-ui/react/checkbox';
import { Field } from '@base-ui/react/field';
import { Select } from '@base-ui/react/select';
import { useState } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type FieldShellProps = {
  label: string;
  error?: string;
  description?: string;
  children: ReactNode;
};

function FieldShell({ label, error, description, children }: FieldShellProps) {
  return (
    <Field.Root className="block">
      <Field.Label className="mb-1 block text-sm text-[var(--text-secondary)]">{label}</Field.Label>
      {children}
      {description && <Field.Description className="mt-1 text-xs text-[var(--text-muted)]">{description}</Field.Description>}
      {error && <Field.Error className="mt-1 text-xs text-[var(--danger-text)]">{error}</Field.Error>}
    </Field.Root>
  );
}

type TextFieldProps = ComponentPropsWithoutRef<'input'> & {
  label: string;
  error?: string;
  description?: string;
};

export function TextField({ label, error, description, className = '', ...props }: TextFieldProps) {
  return (
    <FieldShell label={label} error={error} description={description}>
      <Field.Control
        {...props}
        className={`w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--focus-ring)]/30 ${className}`}
      />
    </FieldShell>
  );
}

type TextareaFieldProps = ComponentPropsWithoutRef<'textarea'> & {
  label: string;
  error?: string;
  description?: string;
};

export function TextareaField({ label, error, description, className = '', ...props }: TextareaFieldProps) {
  return (
    <FieldShell label={label} error={error} description={description}>
      <textarea
        {...props}
        className={`w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--focus-ring)]/30 ${className}`}
      />
    </FieldShell>
  );
}

type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  name: string;
  label: string;
  defaultValue?: string;
  multiple?: boolean;
  size?: number;
  options: SelectOption[];
  error?: string;
  description?: string;
};

export function SelectField({ name, label, defaultValue = '', multiple = false, size, options, error, description }: SelectFieldProps) {
  const [value, setValue] = useState(defaultValue);

  if (multiple) {
    return (
      <FieldShell label={label} error={error} description={description}>
        <select
          name={name}
          multiple
          size={size}
          defaultValue={defaultValue ? defaultValue.split(',') : []}
          className="min-h-32 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--focus-ring)]/30"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FieldShell>
    );
  }

  const selected = options.find((option) => option.value === value);

  return (
    <FieldShell label={label} error={error} description={description}>
      <input type="hidden" name={name} value={value} />
      <Select.Root value={value} onValueChange={(nextValue) => setValue(nextValue ?? '')}>
        <Select.Trigger className="flex w-full items-center justify-between rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-left text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--focus-ring)]/30">
          <Select.Value>{selected?.label ?? '请选择'}</Select.Value>
          <Select.Icon className="text-[var(--text-muted)]">⌄</Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner className="z-50">
            <Select.Popup className="min-w-[var(--anchor-width)] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-1 shadow-xl">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="cursor-pointer rounded px-3 py-2 text-sm text-[var(--text-secondary)] outline-none hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] data-[highlighted]:bg-[var(--bg-elevated)] data-[highlighted]:text-[var(--text-primary)]"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </FieldShell>
  );
}

type CheckboxFieldProps = {
  name: string;
  label: string;
  defaultChecked?: boolean;
  value?: string;
};

export function CheckboxField({ name, label, defaultChecked = false, value = 'on' }: CheckboxFieldProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
      <input type="hidden" name={name} value="" />
      <Checkbox.Root
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="flex size-4 items-center justify-center rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]/30 data-[checked]:bg-[var(--bg-panel-contrast)]"
      >
        <Checkbox.Indicator className="text-xs leading-none">✓</Checkbox.Indicator>
      </Checkbox.Root>
      {label}
    </label>
  );
}
