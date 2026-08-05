'use client';

import { FieldDescription, validators } from '@dynamic-field-kit/core';
import {
  MultiFieldInput,
  useDynamicForm,
  DynamicFormDevTools,
} from '@dynamic-field-kit/react';
import DemoNav from '../DemoNav';
import '../../lib/fieldRegistry';

const fields: FieldDescription[] = [
  {
    name: 'country',
    type: 'select',
    label: '1. Quốc gia (Dynamic Options)',
    options: [
      { label: 'Việt Nam', value: 'VN' },
      { label: 'Hoa Kỳ (USA)', value: 'US' },
    ],
    validate: validators.required('Vui lòng chọn quốc gia'),
  },
  {
    name: 'gender',
    type: 'radio',
    label: '2. Giới tính (Extended HTML5 Radio)',
    options: [
      { label: 'Nam', value: 'male' },
      { label: 'Nữ', value: 'female' },
      { label: 'Khác', value: 'other' },
    ],
  },
  {
    name: 'satisfaction',
    type: 'range',
    label: '3. Mức độ hài lòng (Extended Range Slider)',
    min: 1,
    max: 10,
    step: 1,
  },
  {
    name: 'email',
    type: 'email',
    label: '4. Email (Built-in Validators)',
    placeholder: 'example@domain.com',
    validate: validators.compose(
      validators.required('Email bắt buộc'),
      validators.email('Định dạng email không hợp lệ')
    ),
  },
  {
    name: 'birthDate',
    type: 'date',
    label: '5. Ngày sinh (Native Date Picker)',
  },
  {
    name: 'subscribeNewsletter',
    type: 'switch',
    label: '6. Nhận bản tin ưu đãi (Switch Toggle)',
  },
];

export default function NewFeaturesPage() {
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
    <main
      style={{
        padding: '24px',
        maxWidth: '720px',
        margin: '0 auto',
        fontFamily: 'sans-serif',
      }}
    >
      <DemoNav current="new-features" />

      <h1 style={{ marginBottom: '12px', fontSize: '24px' }}>
        Tính Năng Nâng Cấp Enterprise-Grade (v1.4+)
      </h1>
      <p style={{ color: '#666', marginBottom: '24px', lineHeight: 1.5 }}>
        Minh họa: <code>useDynamicForm</code> state management hook, Extended
        Renderers (<code>radio</code>, <code>range</code>, <code>date</code>,{' '}
        <code>switch</code>), và Realtime <code>DynamicFormDevTools</code> ở góc
        màn hình.
      </p>

      <form
        onSubmit={form.handleSubmit((validData) =>
          alert(`Submit thành công:\n${JSON.stringify(validData, null, 2)}`)
        )}
      >
        <MultiFieldInput
          fieldDescriptions={fields}
          properties={form.data}
          onChange={form.handleChange}
          onBlurField={form.handleBlur}
          layout={{
            type: 'responsive',
            mobile: 'column',
            desktop: { type: 'grid', columns: 2, gap: 16 },
          }}
        />

        <div
          style={{
            marginTop: '20px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              backgroundColor: '#0066cc',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Submit Form
          </button>

          <button
            type="button"
            onClick={() => form.reset()}
            style={{
              padding: '10px 16px',
              backgroundColor: '#e2e8f0',
              color: '#1e293b',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Reset Form
          </button>
        </div>
      </form>

      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
        }}
      >
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
          Form State (useDynamicForm):
        </h3>
        <pre style={{ margin: 0, fontSize: '13px' }}>
          {JSON.stringify(
            {
              data: form.data,
              isDirty: form.isDirty,
              isValid: form.isValid,
              errors: form.errors,
            },
            null,
            2
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
    </main>
  );
}
