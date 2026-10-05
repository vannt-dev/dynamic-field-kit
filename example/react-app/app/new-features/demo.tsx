'use client';

import { FieldDescription, validators } from '@dynamic-field-kit/core';
import {
  MultiFieldInput,
  useDynamicForm,
  DynamicFormDevTools,
} from '@dynamic-field-kit/react';
import '../../lib/fieldRegistry';

const fields: FieldDescription[] = [
  {
    name: 'country',
    type: 'select',
    label: 'Quốc gia',
    options: [
      { label: 'Việt Nam', value: 'VN' },
      { label: 'Hoa Kỳ (USA)', value: 'US' },
    ],
    validate: validators.required('Vui lòng chọn quốc gia'),
  },
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'example@domain.com',
    validate: validators.compose(
      validators.required('Email bắt buộc'),
      validators.email('Định dạng email không hợp lệ'),
    ),
  },
  {
    name: 'gender',
    type: 'radio',
    label: 'Giới tính',
    options: [
      { label: 'Nam', value: 'male' },
      { label: 'Nữ', value: 'female' },
      { label: 'Khác', value: 'other' },
    ],
  },
  {
    name: 'birthDate',
    type: 'date',
    label: 'Ngày sinh',
  },
  {
    name: 'satisfaction',
    type: 'range',
    label: 'Mức độ hài lòng',
    min: 1,
    max: 10,
    step: 1,
  },
  {
    name: 'subscribeNewsletter',
    type: 'switch',
    label: 'Nhận bản tin ưu đãi',
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
          alert(`Submit thành công:\n${JSON.stringify(validData, null, 2)}`),
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
            Submit Form
          </button>
          <button type="button" className="btn" onClick={() => form.reset()}>
            Reset Form
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
