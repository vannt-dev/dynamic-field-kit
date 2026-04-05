import {
  FieldRendererProps,
  FieldTypeKey,
  Properties,
} from '@dynamic-field-kit/core';
import React, { ReactNode, useMemo } from 'react';
import { fieldRegistry } from '../fieldRegistry';

interface Props<T extends FieldTypeKey> {
  type: T;
  value?: unknown;
  onChange?: (value: unknown) => void;
  label?: string;
  options?: Properties[];
  className?: string;
  description?: ReactNode;
}

const DynamicInput = <T extends FieldTypeKey>({
  type,
  value,
  onChange,
  label,
  options,
  className,
  description,
}: Props<T>) => {
  // Memoize renderer lookup to avoid unnecessary work on re-renders
  const Renderer = useMemo(
    () => fieldRegistry.get(type) as React.ComponentType<FieldRendererProps>,
    [type]
  );

  if (!Renderer) {
    return <div>Unknown field type: {type}</div>;
  }

  return React.createElement(Renderer, {
    value,
    onValueChange: onChange,
    label,
    options,
    className,
    description,
  });
};

export default DynamicInput;
