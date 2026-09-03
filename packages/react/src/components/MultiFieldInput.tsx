import {
  applyComputedValues,
  validateFields,
  FieldDescription,
  Properties,
  type ValidationResult,
} from '@dynamic-field-kit/core';
import React, {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { layoutRegistry, LayoutConfig } from '../layout';
import FieldInput from './FieldInput';

/**
 * The slice of `useDynamicForm`'s result `MultiFieldInput` needs to drive
 * itself. Structural, so the hook result can be passed straight in.
 */
export interface DynamicFormBinding {
  data: Properties;
  touched: Record<string, boolean>;
  handleChange: (data: Properties) => void;
  handleBlur: (fieldName: string) => void;
}

/** Imperative handle exposed on a `MultiFieldInput` ref. */
export interface MultiFieldInputHandle {
  /**
   * Clears the internally tracked touched state. Only meaningful in
   * uncontrolled mode - when `touched` is passed as a prop, resetting the form
   * store (e.g. `useDynamicForm().reset()`) already clears it.
   */
  resetTouched: () => void;
  setFieldTouched: (fieldName: string, isTouched?: boolean) => void;
  /** The touched map currently in effect, controlled or internal. */
  getTouched: () => Record<string, boolean>;
}

interface Props {
  fieldDescriptions: FieldDescription[];
  properties?: Properties;
  onChange?: (data: Properties) => void;
  layout?: LayoutConfig;
  /**
   * Namespace for generated field ids: a field renders with
   * `${idPrefix}-${name}`. Defaults to a value unique to this component
   * instance, so two forms containing the same field name do not emit
   * duplicate DOM ids. Pass a fixed string to pin ids (`idPrefix="dfk-field"`
   * restores the pre-1.6 ids), or set `FieldDescription.id` per field.
   */
  idPrefix?: string;
  /**
   * Top-level form data, threaded down through repeatable groups so a nested
   * field's `appearCondition`/`computeValue` can read the root form. Omitted at
   * the top level, where the form's own data is the root.
   */
  rootData?: Properties;
  /**
   * Called with the recursive validation result ({ valid, errors }) on every
   * change. On the top-level component this covers the whole form (groups
   * included).
   */
  onValidityChange?: (result: ValidationResult) => void;
  /**
   * Called with a field's name when it loses focus. Touched state is still
   * tracked internally either way; this is the hook for driving an external
   * form store - pass `useDynamicForm`'s `handleBlur` to get its `touched`
   * map and `validateOnBlur` behaviour.
   */
  onBlurField?: (fieldName: string) => void;
  /**
   * Controlled touched map. When provided it is the single source of truth and
   * the internal tracker is bypassed entirely, so `useDynamicForm().touched`
   * (updated by `setFieldTouched`, `touchAll`, `handleSubmit` and cleared by
   * `reset`) is what renderers actually see. Omit it to keep the internal,
   * blur-only tracker.
   */
  touched?: Record<string, boolean>;
  /** Fires with the next touched map whenever a field is blurred. */
  onTouchedChange?: (touched: Record<string, boolean>) => void;
  /**
   * Shorthand that wires `properties`, `onChange`, `onBlurField` and `touched`
   * from a `useDynamicForm` result in one prop. Individually passed props win
   * over the ones derived from here.
   */
  form?: DynamicFormBinding;
}

function resolveLayout(layout?: LayoutConfig) {
  if (!layout) {
    return { type: 'column', config: {} };
  }
  if (typeof layout === 'string') {
    return { type: layout, config: {} };
  }
  return { type: layout.type, config: layout };
}

const MultiFieldInputInner = (
  {
    fieldDescriptions,
    properties,
    onChange,
    layout,
    idPrefix,
    rootData,
    onValidityChange,
    onBlurField,
    touched: touchedProp,
    onTouchedChange,
    form,
  }: Props,
  ref: React.Ref<MultiFieldInputHandle>,
) => {
  // Explicit props take precedence over the `form` shorthand, so a caller can
  // pass `form` and still override one wire.
  const effectiveProperties = properties ?? form?.data;
  const effectiveOnChange = onChange ?? form?.handleChange;
  const effectiveOnBlurField = onBlurField ?? form?.handleBlur;
  const controlledTouched = touchedProp ?? form?.touched;

  const [data, setData] = useState<Properties>({});
  const [internalTouched, setInternalTouched] = useState<
    Record<string, boolean>
  >({});
  const initialPropertiesRef = useRef<Properties>(effectiveProperties ?? {});

  // Unique per component instance. `useId` is SSR-safe (server and client
  // agree), unlike a module-level counter. Its delimiters vary by React version
  // (':r1:' on 18, '_r_1_' on 19) and are legal in an id attribute but break
  // CSS selectors, so keep only the alphanumeric core.
  const autoId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const effectiveIdPrefix = idPrefix ?? `dfk-${autoId}`;

  // Controlled when a touched map is supplied; otherwise fall back to the
  // internal blur-only tracker.
  const isTouchedControlled = controlledTouched !== undefined;
  const effectiveTouched = controlledTouched ?? internalTouched;

  useEffect(() => {
    if (effectiveProperties) {
      setData(
        applyComputedValues(fieldDescriptions, effectiveProperties, rootData),
      );
    }
    // Only re-run when `properties` itself changes; recomputing on every
    // fieldDescriptions identity change would fight user edits mid-session.
  }, [effectiveProperties]);

  // The root data seen by this level: the prop when nested in a group, else
  // this form's own data at the top level.
  const effectiveRoot = rootData ?? data;

  const visibleFields = useMemo(
    () =>
      fieldDescriptions.filter(
        (f) => !f.appearCondition || f.appearCondition(data, effectiveRoot),
      ),
    [fieldDescriptions, data, effectiveRoot],
  );

  // Keep the latest data/onChange in refs so handleValueChangeField can stay
  // referentially stable (empty deps) without defeating FieldInput's memoization,
  // and without calling onChange from inside a setState updater (must stay pure).
  const dataRef = useRef(data);
  dataRef.current = data;
  const onChangeRef = useRef(effectiveOnChange);
  onChangeRef.current = effectiveOnChange;
  const fieldDescriptionsRef = useRef(fieldDescriptions);
  fieldDescriptionsRef.current = fieldDescriptions;
  const rootDataRef = useRef(rootData);
  rootDataRef.current = rootData;
  const onValidityChangeRef = useRef(onValidityChange);
  onValidityChangeRef.current = onValidityChange;
  const onBlurFieldRef = useRef(effectiveOnBlurField);
  onBlurFieldRef.current = effectiveOnBlurField;
  const onTouchedChangeRef = useRef(onTouchedChange);
  onTouchedChangeRef.current = onTouchedChange;
  const isTouchedControlledRef = useRef(isTouchedControlled);
  isTouchedControlledRef.current = isTouchedControlled;
  const effectiveTouchedRef = useRef(effectiveTouched);
  effectiveTouchedRef.current = effectiveTouched;

  useEffect(() => {
    onValidityChangeRef.current?.(
      validateFields(fieldDescriptions, data, rootData),
    );
  }, [data, fieldDescriptions, rootData]);

  const handleValueChangeField = useCallback((value: unknown, key: string) => {
    const merged = { ...dataRef.current, [key]: value };
    const next = applyComputedValues(
      fieldDescriptionsRef.current,
      merged,
      rootDataRef.current,
    );
    dataRef.current = next;
    setData(next);
    onChangeRef.current?.(next);
  }, []);

  const markTouched = useCallback((key: string, isTouched: boolean) => {
    const current = effectiveTouchedRef.current;
    if (Boolean(current[key]) === isTouched) {
      return;
    }
    const next = { ...current, [key]: isTouched };
    // In controlled mode the owner holds the map; only report the change.
    if (!isTouchedControlledRef.current) {
      effectiveTouchedRef.current = next;
      setInternalTouched(next);
    }
    onTouchedChangeRef.current?.(next);
  }, []);

  const handleBlurField = useCallback(
    (key: string) => {
      markTouched(key, true);
      onBlurFieldRef.current?.(key);
    },
    [markTouched],
  );

  useImperativeHandle(
    ref,
    () => ({
      resetTouched: () => {
        if (!isTouchedControlledRef.current) {
          effectiveTouchedRef.current = {};
        }
        setInternalTouched({});
      },
      setFieldTouched: (fieldName: string, isTouched = true) =>
        markTouched(fieldName, isTouched),
      getTouched: () => effectiveTouchedRef.current,
    }),
    [markTouched],
  );

  const { type, config } = resolveLayout(layout);

  const Layout = layoutRegistry.get(type);

  if (!Layout) {
    throw new Error(`Unknown layout: ${type}`);
  }

  return (
    <Layout config={config}>
      {visibleFields.map((f) => (
        <FieldInput
          key={f.name}
          fieldDescription={f}
          renderInfos={data}
          rootData={effectiveRoot}
          idPrefix={effectiveIdPrefix}
          touched={Boolean(effectiveTouched[f.name])}
          dirty={data[f.name] !== initialPropertiesRef.current[f.name]}
          onBlurField={handleBlurField}
          onValueChangeField={handleValueChangeField}
        />
      ))}
    </Layout>
  );
};

// forwardRef rather than a plain `ref` prop: the package's React peer range
// starts at 18, where ref-as-prop does not exist yet.
const MultiFieldInput = /* @__PURE__ */ React.forwardRef<
  MultiFieldInputHandle,
  Props
>(MultiFieldInputInner);

MultiFieldInput.displayName = 'MultiFieldInput';

export default MultiFieldInput;
