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
  useMemo,
  useRef,
  useState,
} from 'react';

import { layoutRegistry, LayoutConfig } from '../layout';
import FieldInput from './FieldInput';

interface Props {
  fieldDescriptions: FieldDescription[];
  properties?: Properties;
  onChange?: (data: Properties) => void;
  layout?: LayoutConfig;
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

const MultiFieldInput = ({
  fieldDescriptions,
  properties,
  onChange,
  layout,
  rootData,
  onValidityChange,
}: Props) => {
  const [data, setData] = useState<Properties>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const initialPropertiesRef = useRef<Properties>(properties ?? {});

  useEffect(() => {
    if (properties) {
      setData(applyComputedValues(fieldDescriptions, properties, rootData));
    }
    // Only re-run when `properties` itself changes; recomputing on every
    // fieldDescriptions identity change would fight user edits mid-session.
  }, [properties]);

  // The root data seen by this level: the prop when nested in a group, else
  // this form's own data at the top level.
  const effectiveRoot = rootData ?? data;

  const visibleFields = useMemo(
    () =>
      fieldDescriptions.filter(
        (f) => !f.appearCondition || f.appearCondition(data, effectiveRoot)
      ),
    [fieldDescriptions, data, effectiveRoot]
  );

  // Keep the latest data/onChange in refs so handleValueChangeField can stay
  // referentially stable (empty deps) without defeating FieldInput's memoization,
  // and without calling onChange from inside a setState updater (must stay pure).
  const dataRef = useRef(data);
  dataRef.current = data;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const fieldDescriptionsRef = useRef(fieldDescriptions);
  fieldDescriptionsRef.current = fieldDescriptions;
  const rootDataRef = useRef(rootData);
  rootDataRef.current = rootData;
  const onValidityChangeRef = useRef(onValidityChange);
  onValidityChangeRef.current = onValidityChange;

  useEffect(() => {
    onValidityChangeRef.current?.(
      validateFields(fieldDescriptions, data, rootData)
    );
  }, [data, fieldDescriptions, rootData]);

  const handleValueChangeField = useCallback((value: unknown, key: string) => {
    const merged = { ...dataRef.current, [key]: value };
    const next = applyComputedValues(
      fieldDescriptionsRef.current,
      merged,
      rootDataRef.current
    );
    dataRef.current = next;
    setData(next);
    onChangeRef.current?.(next);
  }, []);

  const handleBlurField = useCallback((key: string) => {
    setTouchedFields((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }, []);

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
          touched={Boolean(touchedFields[f.name])}
          dirty={data[f.name] !== initialPropertiesRef.current[f.name]}
          onBlurField={handleBlurField}
          onValueChangeField={handleValueChangeField}
        />
      ))}
    </Layout>
  );
};

export default MultiFieldInput;
