import type { FieldDescription, LayoutConfig } from '@dynamic-field-kit/core';
import {
  DynamicFormDevTools,
  MultiFieldInput,
  useDynamicForm,
} from '@dynamic-field-kit/react';
import React from 'react';

export interface FormDemoProps {
  fields: FieldDescription[];
  layout?: LayoutConfig;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  showDevTools?: boolean;
  initialValues?: Record<string, unknown>;
}

/** A form driven by `useDynamicForm`, with a submit button and its state. */
export function FormDemo({
  fields,
  layout,
  validateOnBlur = true,
  validateOnChange = false,
  showDevTools = false,
  initialValues,
}: FormDemoProps) {
  const form = useDynamicForm({
    fields,
    initialValues,
    validateOnBlur,
    validateOnChange,
  });
  return (
    <form onSubmit={form.handleSubmit(() => undefined)} noValidate>
      <MultiFieldInput fieldDescriptions={fields} form={form} layout={layout} />
      <div className="demo-actions">
        <button type="submit" className="btn btn--primary">
          Submit
        </button>
        <button type="button" className="btn" onClick={() => form.reset()}>
          Reset
        </button>
      </div>
      <div className="demo-panel">
        <h3>Form state</h3>
        <pre data-testid="state">
          {JSON.stringify(
            {
              data: form.data,
              errors: form.errors,
              isDirty: form.isDirty,
              isSubmitted: form.isSubmitted,
            },
            null,
            2,
          )}
        </pre>
      </div>
      {showDevTools && (
        <DynamicFormDevTools
          data={form.data}
          errors={form.errors}
          touched={form.touched}
          isDirty={form.isDirty}
          fields={fields}
        />
      )}
    </form>
  );
}
