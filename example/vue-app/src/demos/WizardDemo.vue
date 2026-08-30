<script setup lang="ts">
import {
  canGoPrev,
  createWizardState,
  goNext,
  goPrev,
  isStepCompleted,
  validateStep,
  validators,
  type FieldDescription,
  type FormStep,
} from '@dynamic-field-kit/core';
import { MultiFieldInput } from '@dynamic-field-kit/vue';
import { ref } from 'vue';
import '../lib/fieldRegistry';

const accountFields: FieldDescription[] = [
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    validate: validators.compose(
      validators.required('Email bắt buộc'),
      validators.email('Định dạng email không hợp lệ'),
    ),
  },
  {
    name: 'password',
    type: 'password',
    label: 'Mật khẩu',
    validate: validators.compose(
      validators.required('Mật khẩu bắt buộc'),
      validators.minLength(8, 'Tối thiểu 8 ký tự'),
    ),
  },
];

const profileFields: FieldDescription[] = [
  {
    name: 'fullName',
    type: 'text',
    label: 'Họ và tên',
    validate: validators.required('Họ tên bắt buộc'),
  },
  { name: 'birthDate', type: 'date', label: 'Ngày sinh' },
];

const preferenceFields: FieldDescription[] = [
  {
    name: 'plan',
    type: 'radio',
    label: 'Gói dịch vụ',
    options: [
      { label: 'Miễn phí', value: 'free' },
      { label: 'Pro', value: 'pro' },
    ],
    validate: validators.required('Vui lòng chọn gói'),
  },
  { name: 'newsletter', type: 'switch', label: 'Nhận bản tin' },
];

const steps: FormStep[] = [
  { id: 'account', title: 'Tài khoản', fields: accountFields },
  { id: 'profile', title: 'Hồ sơ', fields: profileFields },
  { id: 'preferences', title: 'Tuỳ chọn', fields: preferenceFields },
];

const wizard = ref(createWizardState(steps));
const data = ref<Record<string, unknown>>({});
const errors = ref<Record<string, string[]>>({});
const submitted = ref(false);

// goNext does not validate - the wizard decides whether a step may be left.
function next() {
  const result = validateStep(wizard.value.currentStep, data.value);
  errors.value = result.errors;
  if (result.valid) {
    wizard.value = goNext(wizard.value);
  }
}

function finish() {
  const result = validateStep(wizard.value.currentStep, data.value);
  errors.value = result.errors;
  if (result.valid) {
    submitted.value = true;
  }
}
</script>

<template>
  <div>
    <ol
      style="
        display: flex;
        gap: 8px;
        list-style: none;
        padding: 0;
        margin-bottom: 24px;
      "
    >
      <li
        v-for="(step, index) in wizard.steps"
        :key="step.id"
        :style="{
          flex: 1,
          padding: '10px 12px',
          borderRadius: '8px',
          fontSize: '14px',
          border: '1px solid',
          borderColor:
            index === wizard.currentStepIndex ? '#0066cc' : '#d7dee6',
          background:
            index === wizard.currentStepIndex
              ? '#e8f1fc'
              : isStepCompleted(wizard, index)
                ? '#eaf7ee'
                : '#fff',
          fontWeight: index === wizard.currentStepIndex ? 600 : 400,
        }"
      >
        {{ isStepCompleted(wizard, index) ? '✓ ' : `${index + 1}. `
        }}{{ step.title }}
      </li>
    </ol>

    <div
      v-if="submitted"
      style="
        padding: 16px;
        border-radius: 8px;
        background: #eaf7ee;
        border: 1px solid #b7e2c4;
      "
    >
      <strong style="color: #1c7a3d">🎉 Hoàn tất!</strong>
      <pre style="margin-top: 8px; font-size: 12px">{{
        JSON.stringify(data, null, 2)
      }}</pre>
    </div>

    <template v-else>
      <h3 style="font-size: 17px; margin-bottom: 12px">
        Bước {{ wizard.currentStepIndex + 1 }}/{{ wizard.totalSteps }}:
        {{ wizard.currentStep.title }}
      </h3>

      <MultiFieldInput
        :key="wizard.currentStep.id"
        :field-descriptions="wizard.currentStep.fields"
        :properties="data"
        :on-change="(d: Record<string, unknown>) => (data = d)"
        :layout="{ type: 'grid', columns: 2, gap: 16 }"
      />

      <ul
        v-if="Object.keys(errors).length > 0"
        style="color: #c0392b; font-size: 13px"
      >
        <li v-for="(messages, field) in errors" :key="field">
          {{ field }}: {{ messages.join(', ') }}
        </li>
      </ul>

      <div style="margin-top: 20px; display: flex; gap: 12px">
        <button
          type="button"
          :disabled="!canGoPrev(wizard)"
          @click="wizard = goPrev(wizard)"
          style="padding: 10px 18px; cursor: pointer"
        >
          ← Quay lại
        </button>
        <button
          v-if="wizard.isLastStep"
          type="button"
          @click="finish"
          style="
            padding: 10px 18px;
            background: #1c7a3d;
            color: #fff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          "
        >
          Hoàn tất
        </button>
        <button
          v-else
          type="button"
          @click="next"
          style="
            padding: 10px 18px;
            background: #0066cc;
            color: #fff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          "
        >
          Tiếp theo →
        </button>
      </div>
    </template>
  </div>
</template>
