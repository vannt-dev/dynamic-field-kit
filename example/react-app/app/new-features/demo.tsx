'use client';

import { FieldDescription, validators } from '@dynamic-field-kit/core';
import {
  MultiFieldInput,
  useDynamicForm,
  DynamicFormDevTools,
} from '@dynamic-field-kit/react';
import '../../lib/fieldRegistry';
import { t } from '../../../shared/i18n';

const fields: FieldDescription[] = [
  {
    name: 'country',
    type: 'select',
    label: t('Country'),
    options: [
      { label: t('Vietnam'), value: 'VN' },
      { label: t('United States'), value: 'US' },
    ],
    validate: validators.required(t('Please choose a country')),
  },
  {
    name: 'email',
    type: 'email',
    label: t('Email'),
    placeholder: 'example@domain.com',
    validate: validators.compose(
      validators.required(t('Email is required')),
      validators.email(t('Invalid email format')),
    ),
  },
  {
    name: 'gender',
    type: 'radio',
    label: t('Gender'),
    options: [
      { label: t('Male'), value: 'male' },
      { label: t('Female'), value: 'female' },
      { label: t('Other'), value: 'other' },
    ],
  },
  {
    name: 'birthDate',
    type: 'date',
    label: t('Date of birth'),
  },
  {
    name: 'satisfaction',
    type: 'range',
    label: t('Satisfaction'),
    min: 1,
    max: 10,
    step: 1,
  },
  {
    name: 'subscribeNewsletter',
    type: 'switch',
    label: t('Send me the newsletter'),
  },
];

export default function NewFeaturesDemo() {
  const form = useDynamicForm({
    fields,
    initialValues: {
      country: 'VN',
      satisfaction: 8,
      subscribeNewsletter: true,
    },
    validateOnBlur: true,
  });

  return (
    <>
      <form
        onSubmit={form.handleSubmit((validData) =>
          alert(`${t('Submitted:')}\n${JSON.stringify(validData, null, 2)}`),
        )}
      >
        {/* `form` wires the data, change, blur and touched state in one prop */}
        <MultiFieldInput
          fieldDescriptions={fields}
          form={form}
          layout={{
            type: 'responsive',
            mobile: 'column',
            desktop: { type: 'grid', columns: 2, gap: 16 },
          }}
        />

        <div className="demo-actions">
          <button type="submit" className="btn btn--primary">
            {t('Submit Form')}
          </button>
          <button type="button" className="btn" onClick={() => form.reset()}>
            {t('Reset Form')}
          </button>
        </div>
      </form>

      <div className="demo-panel">
        <h3>Form state (useDynamicForm)</h3>
        <pre>
          {JSON.stringify(
            {
              data: form.data,
              isDirty: form.isDirty,
              isValid: form.isValid,
              errors: form.errors,
            },
            null,
            2,
          )}
        </pre>
      </div>

      {/* Floating DevTools */}
      <DynamicFormDevTools
        data={form.data}
        errors={form.errors}
        touched={form.touched}
        isDirty={form.isDirty}
        fields={fields}
      />
    </>
  );
}
