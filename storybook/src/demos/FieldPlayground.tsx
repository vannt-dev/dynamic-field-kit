import type { FieldDescription, Properties } from '@dynamic-field-kit/core';
import { MultiFieldInput } from '@dynamic-field-kit/react';
import React, { useState } from 'react';

export interface FieldPlaygroundProps {
  /** The field from the shared schemas; the other props are merged over it. */
  field: FieldDescription;
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
}

/** One field, rendered by the built-in renderer for its type. */
export function FieldPlayground({
  field,
  label,
  placeholder,
  description,
  required,
  disabled,
}: FieldPlaygroundProps) {
  const [data, setData] = useState<Properties>({});
  const shown: FieldDescription = {
    ...field,
    label: label ?? field.label,
    placeholder: placeholder ?? field.placeholder,
    description: description ?? field.description,
    required,
    disabled,
  };
  return (
    <>
      <MultiFieldInput
        fieldDescriptions={[shown]}
        properties={data}
        onChange={setData}
      />
      <div className="demo-panel">
        <h3>Value</h3>
        <pre data-testid="value">{JSON.stringify(data, null, 2)}</pre>
      </div>
    </>
  );
}
