import {
  FieldRendererProps,
  FieldTypeKey,
  Properties,
} from '@dynamic-field-kit/core';
import React, { ReactNode, useMemo } from 'react';
import { useFieldRegistry } from '../FieldRegistryContext';

interface Props<T extends FieldTypeKey> {
  type: T;
  value?: unknown;
  onChange?: (value: unknown) => void;
  label?: string;
  options?: Properties[];
  className?: string;
  description?: ReactNode;
  disabled?: boolean;
  /** Extra, framework-agnostic props forwarded verbatim to the renderer. */
  extraProps?: Properties;
}

const DynamicInputInner = <T extends FieldTypeKey>({
  type,
  value,
  onChange,
  label,
  options,
  className,
  description,
  disabled,
  extraProps,
}: Props<T>) => {
  const registry = useFieldRegistry();

  // Memoize renderer lookup to avoid unnecessary work on re-renders
  const Renderer = useMemo(
    () => registry.get(type) as React.ComponentType<FieldRendererProps>,
    [registry, type]
  );

  if (!Renderer) {
    return <div>Unknown field type: {type}</div>;
  }

  return React.createElement(Renderer, {
    ...extraProps,
    value,
    onValueChange: onChange,
    label,
    options,
    className,
    description,
    disabled,
  });
};

// Skip re-render when none of the rendered props actually changed, so
// unaffected fields don't re-render every time a sibling field's value changes.
// React.memo erases the generic signature, so restore it via an `unknown`
// round-trip (plain `as typeof DynamicInputInner` fails dts generation).
const DynamicInput = React.memo(
  DynamicInputInner
) as unknown as typeof DynamicInputInner;

export default DynamicInput;
