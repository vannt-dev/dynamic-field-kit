import {
  FieldRendererProps,
  FieldTypeKey,
  makeErrorId,
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

  // Memoize renderer lookup to avoid unnecessary work on re-renders. Whether
  // it fell back to a default is tracked too: a custom renderer owns its own
  // error presentation, and emitting a second message would duplicate it.
  const { Renderer, isDefault } = useMemo(() => {
    const registered = registry.get(type) as
      React.ComponentType<FieldRendererProps> | undefined;
    return {
      Renderer: (registered ??
        getDefaultRenderer(type)) as React.ComponentType<FieldRendererProps>,
      isDefault: !registered,
    };
  }, [registry, type]);

  if (!Renderer) {
    return <div>Unknown field type: {type}</div>;
  }

  const { error, id } = rendererProps as FieldRendererProps;

  // Spread rather than re-listing each prop: the set is fixed by core's
  // FIELD_RENDERER_PROP_KEYS contract, and a hand-maintained list here is
  // exactly how `placeholder`, `min`, `max`, `step`, `accept` and `multiple`
  // came to be silently dropped on their way to the renderer.
  const control = React.createElement(Renderer, {
    ...extraProps,
    ...(rendererProps as FieldRendererProps),
    onValueChange: onChange,
    onBlur,
  });

  if (!isDefault || !error?.length || !id) {
    return control;
  }

  // A fragment, not a wrapper element: the message appears, but nothing about
  // the surrounding layout changes. The id is what `ariaDescribedBy` targets -
  // without this node that reference would dangle.
  return (
    <>
      {control}
      <div id={makeErrorId(id)} className="dfk-field-error" role="alert">
        {error[0]}
      </div>
    </>
  );
};

// Skip re-render when none of the rendered props actually changed, so
// unaffected fields don't re-render every time a sibling field's value changes.
// React.memo erases the generic signature, so restore it via an `unknown`
// round-trip (plain `as typeof DynamicInputInner` fails dts generation).
const DynamicInput = /* @__PURE__ */ React.memo(
  DynamicInputInner,
) as unknown as typeof DynamicInputInner;

export default DynamicInput;
