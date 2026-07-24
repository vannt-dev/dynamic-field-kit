import { FieldDescription, Properties } from '@dynamic-field-kit/core';
import React, { useCallback } from 'react';
import DynamicInput from './DynamicInput';
import FieldGroupInput from './FieldGroupInput';

interface Props {
  fieldDescription: FieldDescription;
  renderInfos: Properties;
  onValueChangeField: (value: unknown, key: string) => void;
}

const FieldInputInner = ({
  fieldDescription,
  renderInfos,
  onValueChangeField,
}: Props) => {
  const { name, type, label, options, className, description, fields } =
    fieldDescription;

  // Stable per-field handler so DynamicInput's memoization isn't defeated
  // by a freshly-allocated closure on every parent render.
  const handleChange = useCallback(
    (v: unknown) => onValueChangeField(v, name),
    [onValueChangeField, name]
  );

  if (fields) {
    const items = Array.isArray(renderInfos[name])
      ? (renderInfos[name] as Properties[])
      : [];

    return (
      <FieldGroupInput
        fieldDescription={fieldDescription}
        items={items}
        onChange={handleChange}
      />
    );
  }

  return (
    <DynamicInput
      type={type}
      label={label}
      value={renderInfos[name]}
      options={options}
      className={className}
      description={description as React.ReactNode}
      onChange={handleChange}
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
    prev.renderInfos[name] === next.renderInfos[name]
  );
});

export default FieldInput;
