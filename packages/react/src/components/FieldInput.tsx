import {
  resolveDisabled,
  resolveOptions,
  resolveReadOnly,
  validateField,
  FieldDescription,
  Properties,
} from '@dynamic-field-kit/core';
import React, { useCallback } from 'react';
import DynamicInput from './DynamicInput';
import FieldGroupInput from './FieldGroupInput';

interface Props {
  fieldDescription: FieldDescription;
  renderInfos: Properties;
  rootData?: Properties;
  touched?: boolean;
  dirty?: boolean;
  onBlurField?: (key: string) => void;
  onValueChangeField: (value: unknown, key: string) => void;
}

const FieldInputInner = ({
  fieldDescription,
  renderInfos,
  rootData,
  touched,
  dirty,
  onBlurField,
  onValueChangeField,
}: Props) => {
  const { name, type, label, className, description, props, fields, required } =
    fieldDescription;

  // Stable per-field handler so DynamicInput's memoization isn't defeated
  // by a freshly-allocated closure on every parent render.
  const handleChange = useCallback(
    (v: unknown) => onValueChangeField(v, name),
    [onValueChangeField, name]
  );

  const handleBlur = useCallback(
    () => onBlurField?.(name),
    [onBlurField, name]
  );

  if (fields) {
    const items = Array.isArray(renderInfos[name])
      ? (renderInfos[name] as Properties[])
      : [];

    return (
      <FieldGroupInput
        fieldDescription={fieldDescription}
        items={items}
        rootData={rootData}
        onChange={handleChange}
      />
    );
  }

  const effectiveDisabled = resolveDisabled(
    fieldDescription,
    renderInfos,
    rootData
  );
  const readOnly = resolveReadOnly(fieldDescription, renderInfos, rootData);
  const resolvedOptionsList = resolveOptions(
    fieldDescription,
    renderInfos,
    rootData
  );
  const errors = effectiveDisabled
    ? []
    : validateField(fieldDescription, renderInfos[name], renderInfos, rootData);
  const error = errors.length > 0 ? errors : undefined;
  const fieldId = `dfk-field-${name}`;

  return (
    <DynamicInput
      id={fieldId}
      type={type}
      label={label}
      value={renderInfos[name]}
      options={resolvedOptionsList}
      className={className}
      description={description as React.ReactNode}
      disabled={effectiveDisabled}
      readOnly={readOnly}
      required={required}
      touched={touched}
      dirty={dirty}
      error={error}
      ariaInvalid={Boolean(error)}
      ariaRequired={Boolean(required)}
      extraProps={props}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

// `renderInfos` covers every field, so the default shallow-prop compare would
// re-render all fields whenever any one of them changes. Compare only the
// slice this field actually reads instead.
const FieldInput = React.memo(FieldInputInner, (prev, next) => {
  const name = prev.fieldDescription.name;
  return (
    prev.fieldDescription === next.fieldDescription &&
    prev.onValueChangeField === next.onValueChangeField &&
    prev.onBlurField === next.onBlurField &&
    prev.rootData === next.rootData &&
    prev.touched === next.touched &&
    prev.dirty === next.dirty &&
    prev.renderInfos[name] === next.renderInfos[name]
  );
});

export default FieldInput;
