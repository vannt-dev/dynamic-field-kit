import {
  buildFieldRendererProps,
  createOptionsLoader,
  isAsyncOptions,
  makeFieldId,
  FieldDescription,
  type OptionsLoader,
  type OptionsState,
  Properties,
} from '@dynamic-field-kit/core';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import DynamicInput from './DynamicInput';
import FieldGroupInput from './FieldGroupInput';

interface Props {
  fieldDescription: FieldDescription;
  renderInfos: Properties;
  rootData?: Properties;
  /** Per-form-instance id namespace; see core's `makeFieldId`. */
  idPrefix?: string;
  touched?: boolean;
  touchedMap?: Record<string, boolean>;
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
  touchedMap,
  dirty,
  errors,
  onBlurField,
  onValueChangeField,
}: Props) => {
  const { name, fields } = fieldDescription;

  // Async options only. A field with a static or synchronous list allocates
  // nothing here and takes the same path it always has.
  const isAsync = isAsyncOptions(fieldDescription);
  const [optionsState, setOptionsState] = useState<OptionsState | undefined>(
    isAsync ? { status: 'idle' } : undefined,
  );
  const loaderRef = useRef<OptionsLoader | undefined>(undefined);
  const fieldRef = useRef(fieldDescription);
  fieldRef.current = fieldDescription;

  // Created lazily rather than during render, and re-created after disposal.
  // StrictMode double-invokes effects (mount, cleanup, mount): a loader built
  // in the render body would be disposed by that cleanup and then reused by
  // the second mount, and every later update would hit its `disposed` guard -
  // options would sit at 'loading' forever in any dev build.
  const ensureLoader = useCallback((): OptionsLoader | undefined => {
    if (!isAsyncOptions(fieldRef.current)) {
      return undefined;
    }
    if (!loaderRef.current) {
      loaderRef.current = createOptionsLoader(
        fieldRef.current,
        setOptionsState,
      );
    }
    return loaderRef.current;
  }, []);

  useEffect(
    () => () => {
      loaderRef.current?.dispose();
      loaderRef.current = undefined;
    },
    [],
  );
  useEffect(() => {
    // The loader decides whether `optionsDeps` actually changed, so calling it
    // on every data change is cheap and keeps that decision in one place.
    ensureLoader()?.update(renderInfos, rootData);
  });

  const handleOptionsQuery = useCallback(
    (query: string) => {
      ensureLoader()?.setQuery(query);
    },
    [ensureLoader],
  );

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
        touched={touchedMap}
        onBlurField={onBlurField}
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
    optionsState,
  });

  return (
    <DynamicInput
      {...rendererProps}
      description={rendererProps.description as React.ReactNode}
      onChange={handleChange}
      onBlur={handleBlur}
      onOptionsQuery={isAsync ? handleOptionsQuery : undefined}
    />
  );
};

// `renderInfos` covers every field, so the default shallow-prop compare would
// re-render all fields whenever any one of them changes. Compare only the
// slice this field actually reads instead.
const FieldInput = /* @__PURE__ */ React.memo(FieldInputInner, (prev, next) => {
  const name = prev.fieldDescription.name;
  // A field whose options load from `optionsDeps` reads values belonging to
  // *other* fields, so the per-field slice check below would skip the render
  // that tells its loader anything changed - a country/city pair would never
  // reload. Compare the whole data object for those.
  if (
    isAsyncOptions(prev.fieldDescription) &&
    prev.renderInfos !== next.renderInfos
  ) {
    return false;
  }
  return (
    prev.fieldDescription === next.fieldDescription &&
    prev.onValueChangeField === next.onValueChangeField &&
    prev.onBlurField === next.onBlurField &&
    prev.rootData === next.rootData &&
    prev.idPrefix === next.idPrefix &&
    prev.touched === next.touched &&
    prev.touchedMap === next.touchedMap &&
    prev.dirty === next.dirty &&
    prev.errors === next.errors &&
    prev.renderInfos[name] === next.renderInfos[name]
  );
});

export default FieldInput;
