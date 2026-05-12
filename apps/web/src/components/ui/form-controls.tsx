'use client';

import { Checkbox } from '@base-ui/react/checkbox';
import { Field } from '@base-ui/react/field';
import { Select } from '@base-ui/react/select';
import { useEffect, useId, useState } from 'react';
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
      <Field.Label className="mb-1 block text-sm text-(--text-secondary)">{label}</Field.Label>
      {children}
      {description && <Field.Description className="mt-1 text-xs text-(--text-muted)">{description}</Field.Description>}
      {error && <Field.Error className="mt-1 text-xs text-(--danger-text)">{error}</Field.Error>}
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
        className={`w-full rounded-[14px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] px-3 py-2 text-sm text-(--text-primary) outline-none transition-colors focus:border-(--border-glow) focus:ring-2 focus:ring-(--focus-ring)/30 ${className}`}
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
  const generatedId = useId();
  const controlId = props.id ?? generatedId;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="block">
      <label htmlFor={controlId} className="mb-1 block text-sm text-(--text-secondary)">
        {label}
      </label>
      <textarea
        {...props}
        id={controlId}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-[14px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] px-3 py-2 text-sm text-(--text-primary) outline-none transition-colors focus:border-(--border-glow) focus:ring-2 focus:ring-(--focus-ring)/30 ${className}`}
      />
      {description && <p id={descriptionId} className="mt-1 text-xs text-(--text-muted)">{description}</p>}
      {error && <p id={errorId} className="mt-1 text-xs text-(--danger-text)">{error}</p>}
    </div>
  );
}

type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  name: string;
  label: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  multiple?: boolean;
  size?: number;
  disabled?: boolean;
  options: SelectOption[];
  error?: string;
  description?: string;
  onValueChange?: (value: string) => void;
};

export function SelectField({
  name,
  label,
  value,
  defaultValue = '',
  placeholder = '请选择',
  multiple = false,
  size,
  disabled = false,
  options,
  error,
  description,
  onValueChange,
}: SelectFieldProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);

  useEffect(() => {
    if (!isControlled) {
      setInternalValue(defaultValue);
    }
  }, [defaultValue, isControlled]);

  const currentValue = isControlled ? value : internalValue;

  if (multiple) {
    const selectedValues = currentValue ? currentValue.split(',').filter(Boolean) : [];

    return (
      <FieldShell label={label} error={error} description={description}>
        {selectedValues.map((selectedValue) => (
          <input key={selectedValue} type="hidden" name={name} value={selectedValue} />
        ))}
        <div
          className="grid gap-1.5 rounded-[10px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] p-2.5"
          style={size ? { minHeight: `${size * 2.15}rem` } : undefined}
        >
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm leading-5 text-(--text-secondary)">
              <Checkbox.Root
                checked={selectedValues.includes(option.value)}
                disabled={disabled}
                onCheckedChange={(checked) => {
                  const nextValues = checked === true
                    ? [...selectedValues, option.value]
                    : selectedValues.filter((value) => value !== option.value);
                  const nextValue = nextValues.join(',');
                  if (!isControlled) setInternalValue(nextValue);
                  onValueChange?.(nextValue);
                }}
                className="flex size-4 items-center justify-center rounded border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] text-(--text-primary) outline-none focus:ring-2 focus:ring-(--focus-ring)/30 data-[checked]:bg-(--bg-panel-contrast)"
              >
                <Checkbox.Indicator className="text-xs leading-none">✓</Checkbox.Indicator>
              </Checkbox.Root>
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </FieldShell>
    );
  }

  const selected = options.find((option) => option.value === currentValue);

  return (
    <FieldShell label={label} error={error} description={description}>
      <input type="hidden" name={name} value={currentValue} />
      <Select.Root
        disabled={disabled}
        value={currentValue}
        onValueChange={(nextValue) => {
          const resolvedValue = nextValue ?? '';
          if (!isControlled) setInternalValue(resolvedValue);
          onValueChange?.(resolvedValue);
        }}
      >
        <Select.Trigger className="flex w-full items-center justify-between rounded-[14px] border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] px-3 py-2 text-left text-sm text-(--text-primary) outline-none transition-colors focus:border-(--border-glow) focus:ring-2 focus:ring-(--focus-ring)/30 disabled:cursor-not-allowed disabled:opacity-50">
          <Select.Value>{selected?.label ?? placeholder}</Select.Value>
          <Select.Icon className="text-(--text-muted)">⌄</Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner className="z-50">
            <Select.Popup className="metal-frame min-w-[var(--anchor-width)] rounded-[14px] border border-(--border-hairline) bg-(--bg-surface-2) p-1 shadow-xl">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="cursor-pointer rounded-[10px] px-3 py-2 text-sm text-(--text-secondary) outline-none hover:bg-[color:rgba(255,255,255,0.05)] hover:text-(--text-primary) data-[highlighted]:bg-[color:rgba(255,255,255,0.05)] data-[highlighted]:text-(--text-primary)"
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
  checked?: boolean;
  defaultChecked?: boolean;
  value?: string;
  description?: string;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export function CheckboxField({
  name,
  label,
  checked,
  defaultChecked = false,
  value = 'on',
  description,
  disabled = false,
  onCheckedChange,
}: CheckboxFieldProps) {
  return (
    <label className={`flex items-start gap-2 text-sm text-(--text-secondary) ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
      <input type="hidden" name={name} value="" />
      <Checkbox.Root
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onCheckedChange={(nextChecked) => onCheckedChange?.(nextChecked === true)}
        className="flex size-4 items-center justify-center rounded border border-(--border-hairline) bg-[color:rgba(255,255,255,0.03)] text-(--text-primary) outline-none focus:ring-2 focus:ring-(--focus-ring)/30 data-[checked]:bg-(--bg-panel-contrast) disabled:cursor-not-allowed"
      >
        <Checkbox.Indicator className="text-xs leading-none">✓</Checkbox.Indicator>
      </Checkbox.Root>
      <span>
        <span>{label}</span>
        {description && <span className="mt-1 block text-xs text-(--text-muted)">{description}</span>}
      </span>
    </label>
  );
}
