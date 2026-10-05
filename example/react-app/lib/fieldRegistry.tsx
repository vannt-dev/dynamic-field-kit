'use client';

import { fieldRegistry } from '@dynamic-field-kit/react';
import type { FieldRendererProps } from '@dynamic-field-kit/core';

// One set of renderers serves every value type, so the props stay loose here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = FieldRendererProps<any>;
import type { ReactNode } from 'react';

// The renderers this app draws its fields with. The kit's built-in renderers
// are bare inputs with no label and no styling, so an application registers
// its own for every type it uses - these are plain HTML styled by
// `example/shared/demo.css`.

type Option = { label?: string; value: string | number } | string;

const optionValue = (opt: Option) =>
  typeof opt === 'string' ? opt : opt.value;
const optionLabel = (opt: Option) =>
  typeof opt === 'string' ? opt : (opt.label ?? String(opt.value));

/** An error is shown once the field has been visited, not while it is pristine. */
function shownError({ error, touched }: Props) {
  if (!touched || !error) return undefined;
  return Array.isArray(error) ? error.join(', ') : error;
}

function Field({ props, children }: { props: Props; children: ReactNode }) {
  const error = shownError(props);
  return (
    <label className={`field${error ? ' field--invalid' : ''}`}>
      {props.label && <span className="field__label">{props.label}</span>}
      {children}
      {error && <span className="field__error">{error}</span>}
    </label>
  );
}

const input = (type: string) =>
  function InputRenderer(props: Props) {
    const { value, onValueChange, onBlur, disabled, readOnly, placeholder } =
      props;
    return (
      <Field props={props}>
        <input
          type={type}
          className="field__control"
          value={(value as string | number | undefined) ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(e) =>
            onValueChange?.(
              type === 'number'
                ? e.target.value === ''
                  ? undefined
                  : Number(e.target.value)
                : e.target.value,
            )
          }
          onBlur={onBlur}
        />
      </Field>
    );
  };

for (const type of ['text', 'email', 'password', 'number', 'date'] as const) {
  fieldRegistry.register(type, input(type));
}

fieldRegistry.register('select', (props: Props) => {
  const { value, onValueChange, onBlur, disabled, readOnly, options } = props;
  return (
    <Field props={props}>
      <select
        className="field__control"
        value={(value as string | undefined) ?? ''}
        disabled={disabled || readOnly}
        onChange={(e) => onValueChange?.(e.target.value)}
        onBlur={onBlur}
      >
        <option value="">-- Chọn --</option>
        {((options as Option[]) || []).map((opt) => (
          <option key={optionValue(opt)} value={optionValue(opt)}>
            {optionLabel(opt)}
          </option>
        ))}
      </select>
    </Field>
  );
});

fieldRegistry.register('radio', (props: Props) => {
  const { value, onValueChange, onBlur, disabled, options, id } = props;
  const error = shownError(props);
  return (
    <fieldset className={`field${error ? ' field--invalid' : ''}`}>
      {props.label && <legend className="field__label">{props.label}</legend>}
      <div className="field__options">
        {((options as Option[]) || []).map((opt) => (
          <label key={optionValue(opt)}>
            <input
              type="radio"
              name={id}
              checked={value === optionValue(opt)}
              disabled={disabled}
              onChange={() => onValueChange?.(optionValue(opt))}
              onBlur={onBlur}
            />
            {optionLabel(opt)}
          </label>
        ))}
      </div>
      {error && <span className="field__error">{error}</span>}
    </fieldset>
  );
});

fieldRegistry.register('range', (props: Props) => {
  const { value, onValueChange, onBlur, disabled, min, max, step } = props;
  return (
    <Field props={props}>
      <span className="field__range">
        <input
          type="range"
          min={min as number | undefined}
          max={max as number | undefined}
          step={step as number | undefined}
          value={(value as number | undefined) ?? (min as number) ?? 0}
          disabled={disabled}
          onChange={(e) => onValueChange?.(Number(e.target.value))}
          onBlur={onBlur}
        />
        <output>{String(value ?? '')}</output>
      </span>
    </Field>
  );
});

function CheckRenderer(props: Props) {
  const { value, onValueChange, onBlur, disabled, readOnly, label } = props;
  return (
    <label className="field field--inline">
      <input
        type="checkbox"
        checked={Boolean(value)}
        disabled={disabled || readOnly}
        onChange={(e) => onValueChange?.(e.target.checked)}
        onBlur={onBlur}
      />
      {label}
    </label>
  );
}

fieldRegistry.register('checkbox', CheckRenderer);
fieldRegistry.register('switch', CheckRenderer);
