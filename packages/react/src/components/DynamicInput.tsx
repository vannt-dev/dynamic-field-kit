import {
  FieldRendererProps,
  FieldTypeKey,
  Properties,
} from '@dynamic-field-kit/core';
import React, { ReactNode, useMemo } from 'react';
import { getDefaultRenderer } from '../defaultRenderers';
import { useFieldRegistry } from '../FieldRegistryContext';

interface Props<T extends FieldTypeKey> {
  type: T;
  value?: unknown;
  onChange?: (value: unknown) => void;
  onBlur?: () => void;
  label?: string;
  placeholder?: string;
  options?: Properties[];
  className?: string;
  description?: ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  touched?: boolean;
  dirty?: boolean;
  error?: string | string[];
  id?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  ariaRequired?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  accept?: string;
  multiple?: boolean;
  /** Extra, framework-agnostic props forwarded verbatim to the renderer. */
  extraProps?: Properties;
}

const DynamicInputInner = <T extends FieldTypeKey>({
  type,
  onChange,
  onBlur,
  extraProps,
  ...rendererProps
}: Props<T>) => {
  const registry = useFieldRegistry();

  // Memoize renderer lookup to avoid unnecessary work on re-renders
  const Renderer = useMemo(
    () =>
      ((registry.get(type) as React.ComponentType<FieldRendererProps>) ||
        getDefaultRenderer(type)) as React.ComponentType<FieldRendererProps>,
    [registry, type],
  );

  if (!Renderer) {
    return <div>Unknown field type: {type}</div>;
  }

  // Spread rather than re-listing each prop: the set is fixed by core's
  // FIELD_RENDERER_PROP_KEYS contract, and a hand-maintained list here is
  // exactly how `placeholder`, `min`, `max`, `step`, `accept` and `multiple`
  // came to be silently dropped on their way to the renderer.
  return React.createElement(Renderer, {
    ...extraProps,
    ...(rendererProps as FieldRendererProps),
    onValueChange: onChange,
    onBlur,
  });
};

// Skip re-render when none of the rendered props actually changed, so
// unaffected fields don't re-render every time a sibling field's value changes.
// React.memo erases the generic signature, so restore it via an `unknown`
// round-trip (plain `as typeof DynamicInputInner` fails dts generation).
const DynamicInput = /* @__PURE__ */ React.memo(
  DynamicInputInner,
) as unknown as typeof DynamicInputInner;

export default DynamicInput;
