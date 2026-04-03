import { FieldTypeKey, Properties } from '@dynamic-field-kit/core';
import React, { ReactNode, useMemo } from 'react';
import { fieldRegistry } from '../fieldRegistry';

interface Props<T extends FieldTypeKey> {
  type: T;
  value?: any;
  onChange?: (value: any) => void;
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
  const Renderer = useMemo(() => fieldRegistry.get(type), [type]) as any;

  if (!Renderer) {
    return <div>Unknown field type: {type}</div>;
  }

  // Use direct element creation to avoid TSX generic typing pitfalls
  const RendererEl = Renderer as any;
  return React.createElement(RendererEl, {
    value,
    onValueChange: onChange,
    label,
    options,
    className,
    description,
  });
};

export default DynamicInput;
