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

export const DefaultRadioRenderer: React.FC<FieldRendererProps> = ({
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
}) => (
  <div className={`dfk-radio-group ${className || ''}`} id={id} onBlur={onBlur}>
    {options.map((opt, i) => {
      const optVal = opt.value ?? opt.id ?? opt;
      const optLabel = opt.label ?? opt.name ?? String(optVal);
      const isChecked = String(value) === String(optVal);
      const radioId = `${id || 'radio'}-${i}`;
      return (
        <label
          key={String(optVal) + i}
          htmlFor={radioId}
          style={{
            marginRight: '12px',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <input
            type="radio"
            id={radioId}
            name={id}
            value={String(optVal)}
            checked={isChecked}
            onChange={() => onValueChange?.(optVal)}
            disabled={disabled || readOnly}
            required={required}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedBy}
          />
          <span style={{ marginLeft: '4px' }}>{String(optLabel)}</span>
        </label>
      );
    })}
  </div>
);

export const DefaultRangeRenderer: React.FC<FieldRendererProps> = ({
  value,
  onValueChange,
  onBlur,
  disabled,
  readOnly,
  required,
  min,
  max,
  step,
  id,
  className,
  ariaInvalid,
  ariaDescribedBy,
}) => (
  <input
    type="range"
    id={id}
    className={className}
    value={(value as number) ?? min ?? 0}
    min={min}
    max={max}
    step={step}
    onChange={(e) => onValueChange?.(Number(e.target.value))}
    onBlur={onBlur}
    disabled={disabled || readOnly}
    required={required}
    aria-invalid={ariaInvalid}
    aria-describedby={ariaDescribedBy}
  />
);

export const DefaultFileRenderer: React.FC<FieldRendererProps> = ({
  onValueChange,
  onBlur,
  disabled,
  readOnly,
  required,
  accept,
  multiple,
  id,
  className,
  ariaInvalid,
  ariaDescribedBy,
}) => (
  <input
    type="file"
    id={id}
    className={className}
    accept={accept}
    multiple={multiple}
    onChange={(e) => {
      const files = e.target.files;
      if (!files) {
        return;
      }
      onValueChange?.(multiple ? Array.from(files) : files[0] || null);
    }}
    onBlur={onBlur}
    disabled={disabled || readOnly}
    required={required}
    aria-invalid={ariaInvalid}
    aria-describedby={ariaDescribedBy}
  />
);

export const DefaultDateRenderer: React.FC<FieldRendererProps> = (props) => (
  <DefaultTextRenderer {...props} inputType="date" />
);

export const DefaultTimeRenderer: React.FC<FieldRendererProps> = (props) => (
  <DefaultTextRenderer {...props} inputType="time" />
);

export const DefaultDateTimeLocalRenderer: React.FC<FieldRendererProps> = (
  props
) => <DefaultTextRenderer {...props} inputType="datetime-local" />;

export const DefaultSwitchRenderer: React.FC<FieldRendererProps> = (props) => (
  <DefaultCheckboxRenderer {...props} />
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
  radio: DefaultRadioRenderer,
  range: DefaultRangeRenderer,
  file: DefaultFileRenderer,
  date: DefaultDateRenderer,
  time: DefaultTimeRenderer,
  'datetime-local': DefaultDateTimeLocalRenderer,
  switch: DefaultSwitchRenderer,
};

export function getDefaultRenderer(
  type: string
): React.FC<FieldRendererProps> | undefined {
  return defaultRenderersMap[type];
}
