<script setup lang="ts">
import { validators } from '@dynamic-field-kit/core';
import {
  type FieldDescription,
  DynamicFormDevTools,
  MultiFieldInput,
  useDynamicForm,
} from '@dynamic-field-kit/vue';
import '../lib/fieldRegistry';

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
    ],
  },
  {
    name: 'satisfaction',
    type: 'range',
    label: '3. Mức độ hài lòng (Range Slider)',
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
    label: '6. Nhận bản tin (Switch Toggle)',
  },
];

// The composable owns data, errors, touched and submission state.
const form = useDynamicForm({
  fields,
  initialValues: { country: 'VN', satisfaction: 8, subscribeNewsletter: true },
  validateOnBlur: true,
});

const onSubmit = form.handleSubmit((data) => {
  alert(`Submit thành công:\n${JSON.stringify(data, null, 2)}`);
});
</script>

<template>
  <form @submit="onSubmit">
    <MultiFieldInput
      :field-descriptions="fields"
      :properties="form.data.value"
      :on-change="form.handleChange"
      :on-blur-field="form.handleBlur"
      :layout="{
        type: 'responsive',
        mobile: 'column',
        desktop: { type: 'grid', columns: 2, gap: 16 },
      }"
    />

    <div
      style="margin-top: 20px; display: flex; gap: 12px; align-items: center"
    >
      <button
        type="submit"
        :disabled="form.isSubmitting.value"
        style="
          padding: 10px 18px;
          background: #0066cc;
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        "
      >
        {{ form.isSubmitting.value ? 'Đang gửi…' : 'Gửi đăng ký' }}
      </button>
      <button
        type="button"
        @click="form.reset()"
        style="padding: 10px 18px; cursor: pointer"
      >
        Reset
      </button>
    </div>

    <div
      style="
        margin-top: 24px;
        padding: 16px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
      "
    >
      <h3 style="margin: 0 0 8px; font-size: 15px">Form State</h3>
      <p style="margin: 0 0 8px; font-size: 13px; color: #64748b">
        isDirty: {{ form.isDirty.value }} · isValid: {{ form.isValid.value }} ·
        isSubmitted: {{ form.isSubmitted.value }} · touched:
        {{ Object.keys(form.touched.value).join(', ') || '—' }}
      </p>
      <pre style="margin: 0; font-size: 12px">{{
        JSON.stringify(form.data.value, null, 2)
      }}</pre>
    </div>

    <DynamicFormDevTools
      :data="form.data.value"
      :errors="form.errors.value"
      :touched="form.touched.value"
      :is-dirty="form.isDirty.value"
      :fields="fields"
    />
  </form>
</template>
