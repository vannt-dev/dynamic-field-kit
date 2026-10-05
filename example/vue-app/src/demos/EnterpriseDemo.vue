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
    label: 'Quốc gia',
    options: [
      { label: 'Việt Nam', value: 'VN' },
      { label: 'Hoa Kỳ (USA)', value: 'US' },
    ],
    validate: validators.required('Vui lòng chọn quốc gia'),
  },
  {
    name: 'gender',
    type: 'radio',
    label: 'Giới tính',
    options: [
      { label: 'Nam', value: 'male' },
      { label: 'Nữ', value: 'female' },
    ],
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
    name: 'birthDate',
    type: 'date',
    label: 'Ngày sinh',
  },
  {
    name: 'subscribeNewsletter',
    type: 'switch',
    label: 'Nhận bản tin',
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
    <!-- `form` wires the data, change, blur and touched state in one prop -->
    <MultiFieldInput
      :field-descriptions="fields"
      :form="form"
      :layout="{
        type: 'responsive',
        mobile: 'column',
        desktop: { type: 'grid', columns: 2, gap: 16 },
      }"
    />

    <div class="demo-actions">
      <button
        type="submit"
        class="btn btn--primary"
        :disabled="form.isSubmitting.value"
      >
        {{ form.isSubmitting.value ? 'Đang gửi…' : 'Gửi đăng ký' }}
      </button>
      <button type="button" class="btn" @click="form.reset()">Reset</button>
    </div>

    <div class="demo-panel">
      <h3>Form state (useDynamicForm)</h3>
      <p class="demo-note" style="margin: 0 0 8px">
        isDirty: {{ form.isDirty.value }} · isValid: {{ form.isValid.value }} ·
        isSubmitted: {{ form.isSubmitted.value }} · touched:
        {{ Object.keys(form.touched.value).join(', ') || '—' }}
      </p>
      <pre>{{ JSON.stringify(form.data.value, null, 2) }}</pre>
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
