import { FieldRendererProps } from '@dynamic-field-kit/core';
import React from 'react';

export interface DefaultInputProps extends FieldRendererProps {
  inputType?: string;
}

export const DefaultTextRenderer: React.FC<DefaultInputProps> = ({
  value,
  onValueChange,
  onBlur,
  disabled,
  readOnly,
  required,
  placeholder,
  id,
  className,
  ariaInvalid,
  ariaDescribedBy,
  ariaRequired,
  inputType = 'text',
}) => (
  <input
    type={inputType}
    id={id}
    className={className}
    value={(value as string | number) ?? ''}
    onChange={(e) => onValueChange?.(e.target.value)}
    onBlur={onBlur}
    disabled={disabled}
    readOnly={readOnly}
    required={required}
    placeholder={placeholder}
    aria-invalid={ariaInvalid}
    aria-describedby={ariaDescribedBy}
    aria-required={ariaRequired}
  />
);

export const DefaultNumberRenderer: React.FC<FieldRendererProps> = ({
  value,
  onValueChange,
  onBlur,
  disabled,
  readOnly,
  required,
  placeholder,
  id,
  className,
  ariaInvalid,
  ariaDescribedBy,
  ariaRequired,
}) => (
  <input
    type="number"
    id={id}
    className={className}
    value={(value as number) ?? ''}
    onChange={(e) =>
      onValueChange?.(
        e.target.value === '' ? undefined : Number(e.target.value)
      )
    }
    onBlur={onBlur}
    disabled={disabled}
    readOnly={readOnly}
    required={required}
    placeholder={placeholder}
    aria-invalid={ariaInvalid}
    aria-describedby={ariaDescribedBy}
    aria-required={ariaRequired}
  />
);

export const DefaultPasswordRenderer: React.FC<FieldRendererProps> = (
  props
) => <DefaultTextRenderer {...props} inputType="password" />;

export const DefaultEmailRenderer: React.FC<FieldRendererProps> = (props) => (
  <DefaultTextRenderer {...props} inputType="email" />
);

export const DefaultTextareaRenderer: React.FC<FieldRendererProps> = ({
  value,
  onValueChange,
  onBlur,
  disabled,
  readOnly,
  required,
  placeholder,
  id,
  className,
  ariaInvalid,
  ariaDescribedBy,
  ariaRequired,
}) => (
  <textarea
    id={id}
    className={className}
    value={(value as string) ?? ''}
    onChange={(e) => onValueChange?.(e.target.value)}
    onBlur={onBlur}
    disabled={disabled}
    readOnly={readOnly}
    required={required}
    placeholder={placeholder}
    aria-invalid={ariaInvalid}
    aria-describedby={ariaDescribedBy}
    aria-required={ariaRequired}
  />
);

export const DefaultCheckboxRenderer: React.FC<FieldRendererProps> = ({
  value,
  onValueChange,
  onBlur,
  disabled,
  readOnly,
  required,
  id,
  className,
  ariaInvalid,
  ariaDescribedBy,
  ariaRequired,
}) => (
  <input
    type="checkbox"
    id={id}
    className={className}
    checked={Boolean(value)}
    onChange={(e) => onValueChange?.(e.target.checked)}
    onBlur={onBlur}
    disabled={disabled || readOnly}
    required={required}
    aria-invalid={ariaInvalid}
    aria-describedby={ariaDescribedBy}
    aria-required={ariaRequired}
  />
);

export const DefaultSelectRenderer: React.FC<FieldRendererProps> = ({
  value,
  onValueChange,
  onBlur,
  disabled,
  readOnly,
  required,
  options = [],
  id,
  className,
  ariaInvalid,
  ariaDescribedBy,
  ariaRequired,
}) => (
  <select
    id={id}
    className={className}
    value={(value as string | number) ?? ''}
    onChange={(e) => onValueChange?.(e.target.value)}
    onBlur={onBlur}
    disabled={disabled || readOnly}
    required={required}
    aria-invalid={ariaInvalid}
    aria-describedby={ariaDescribedBy}
    aria-required={ariaRequired}
  >
    <option value="" disabled>
      -- Select --
    </option>
    {options.map((opt, i) => {
      const optVal = opt.value ?? opt.id ?? opt;
      const optLabel = opt.label ?? opt.name ?? String(optVal);
      return (
        <option key={String(optVal) + i} value={String(optVal)}>
          {String(optLabel)}
        </option>
      );
    })}
  </select>
);

export const defaultRenderersMap: Record<
  string,
  React.FC<FieldRendererProps>
> = {
  text: DefaultTextRenderer,
  number: DefaultNumberRenderer,
  password: DefaultPasswordRenderer,
  email: DefaultEmailRenderer,
  textarea: DefaultTextareaRenderer,
  checkbox: DefaultCheckboxRenderer,
  select: DefaultSelectRenderer,
};

export function getDefaultRenderer(
  type: string
): React.FC<FieldRendererProps> | undefined {
  return defaultRenderersMap[type];
}
