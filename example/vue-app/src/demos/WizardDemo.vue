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
const touched = ref<Record<string, boolean>>({});
const submitted = ref(false);

// goNext does not validate - the wizard decides whether a step may be left.
function leaveStep(): boolean {
  const result = validateStep(wizard.value.currentStep, data.value);
  errors.value = result.errors;
  // A failed attempt marks the whole step as visited, so every message shows.
  for (const field of wizard.value.currentStep.fields) {
    touched.value = { ...touched.value, [field.name]: true };
  }
  return result.valid;
}

function onChange(next: Record<string, unknown>) {
  data.value = next;
  if (Object.keys(errors.value).length > 0) {
    errors.value = validateStep(wizard.value.currentStep, next).errors;
  }
}

function next() {
  if (leaveStep()) wizard.value = goNext(wizard.value);
}

function prev() {
  errors.value = {};
  wizard.value = goPrev(wizard.value);
}

function finish() {
  if (leaveStep()) submitted.value = true;
}

function stepState(index: number) {
  if (!submitted.value && index === wizard.value.currentStepIndex) {
    return 'current';
  }
  return submitted.value || isStepCompleted(wizard.value, index)
    ? 'done'
    : 'todo';
}
</script>

<template>
  <div>
    <ol class="demo-steps">
      <li
        v-for="(step, index) in wizard.steps"
        :key="step.id"
        :class="['demo-step', `demo-step--${stepState(index)}`]"
        :aria-current="stepState(index) === 'current' ? 'step' : undefined"
      >
        {{ stepState(index) === 'done' ? '✓ ' : `${index + 1}. `
        }}{{ step.title }}
      </li>
    </ol>

    <div v-if="submitted" class="demo-notice">
      <strong>Hoàn tất!</strong>
      <pre class="demo-panel">{{ JSON.stringify(data, null, 2) }}</pre>
    </div>

    <template v-else>
      <h2>
        Bước {{ wizard.currentStepIndex + 1 }}/{{ wizard.totalSteps }}:
        {{ wizard.currentStep.title }}
      </h2>

      <!-- Only the current step's fields are rendered -->
      <MultiFieldInput
        :key="wizard.currentStep.id"
        :field-descriptions="wizard.currentStep.fields"
        :properties="data"
        :on-change="onChange"
        :errors="errors"
        :touched="touched"
        :on-blur-field="
          (name: string) => (touched = { ...touched, [name]: true })
        "
        :layout="{
          type: 'responsive',
          mobile: 'column',
          desktop: { type: 'grid', columns: 2, gap: 16 },
        }"
      />

      <div class="demo-actions">
        <button
          type="button"
          class="btn"
          :disabled="!canGoPrev(wizard)"
          @click="prev"
        >
          ← Quay lại
        </button>
        <button
          v-if="wizard.isLastStep"
          type="button"
          class="btn btn--primary"
          @click="finish"
        >
          Hoàn tất
        </button>
        <button v-else type="button" class="btn btn--primary" @click="next">
          Tiếp theo →
        </button>
      </div>
    </template>
  </div>
</template>
