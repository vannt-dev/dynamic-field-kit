import {
  applyComputedValues,
  FieldDescription,
  Properties,
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
}: Props) => {
  const [data, setData] = useState<Properties>({});

  useEffect(() => {
    if (properties) {
      setData(applyComputedValues(fieldDescriptions, properties));
    }
    // Only re-run when `properties` itself changes; recomputing on every
    // fieldDescriptions identity change would fight user edits mid-session.
  }, [properties]);

  const visibleFields = useMemo(
    () =>
      fieldDescriptions.filter(
        (f) => !f.appearCondition || f.appearCondition(data)
      ),
    [fieldDescriptions, data]
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

  const handleValueChangeField = useCallback((value: unknown, key: string) => {
    const next = applyComputedValues(fieldDescriptionsRef.current, {
      ...dataRef.current,
      [key]: value,
    });
    dataRef.current = next;
    setData(next);
    onChangeRef.current?.(next);
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
          onValueChangeField={handleValueChangeField}
        />
      ))}
    </Layout>
  );
};

export default MultiFieldInput;
