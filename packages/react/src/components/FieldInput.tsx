import {
  buildFieldRendererProps,
  makeFieldId,
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
  /** Per-form-instance id namespace; see core's `makeFieldId`. */
  idPrefix?: string;
  touched?: boolean;
  dirty?: boolean;
  errors?: Record<string, string[]>;
  onBlurField?: (key: string) => void;
  onValueChangeField: (value: unknown, key: string) => void;
}

const FieldInputInner = ({
  fieldDescription,
  renderInfos,
  rootData,
  idPrefix = 'dfk-field',
  touched,
  dirty,
  errors,
  onBlurField,
  onValueChangeField,
}: Props) => {
  const { name, fields } = fieldDescription;

  // Stable per-field handler so DynamicInput's memoization isn't defeated
  // by a freshly-allocated closure on every parent render.
  const handleChange = useCallback(
    (v: unknown) => onValueChangeField(v, name),
    [onValueChangeField, name],
  );

  const handleBlur = useCallback(
    () => onBlurField?.(name),
    [onBlurField, name],
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
        errors={errors}
        onChange={handleChange}
      />
    );
  }

  const rendererProps = buildFieldRendererProps({
    fieldDescription,
    data: renderInfos,
    rootData,
    id: makeFieldId(fieldDescription, idPrefix),
    touched,
    dirty,
    validationErrors: errors === undefined ? undefined : (errors[name] ?? []),
  });

  return (
    <DynamicInput
      {...rendererProps}
      description={rendererProps.description as React.ReactNode}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

// `renderInfos` covers every field, so the default shallow-prop compare would
// re-render all fields whenever any one of them changes. Compare only the
// slice this field actually reads instead.
const FieldInput = /* @__PURE__ */ React.memo(FieldInputInner, (prev, next) => {
  const name = prev.fieldDescription.name;
  return (
    prev.fieldDescription === next.fieldDescription &&
    prev.onValueChangeField === next.onValueChangeField &&
    prev.onBlurField === next.onBlurField &&
    prev.rootData === next.rootData &&
    prev.idPrefix === next.idPrefix &&
    prev.touched === next.touched &&
    prev.dirty === next.dirty &&
    prev.errors === next.errors &&
    prev.renderInfos[name] === next.renderInfos[name]
  );
});

export default FieldInput;
