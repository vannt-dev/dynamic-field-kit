<script setup lang="ts">
import { type FieldDescription, MultiFieldInput } from '@dynamic-field-kit/vue';
import {
  validators,
  validateFields,
  validateFieldsAsync,
} from '@dynamic-field-kit/core';
import { ref } from 'vue';
import './lib/fieldRegistry';

const activeTab = ref<'legacy' | 'new'>('legacy');

// 1. Legacy fields
const legacyFields: FieldDescription[] = [
  { name: 'firstName', type: 'text', label: 'First Name' },
  { name: 'lastName', type: 'text', label: 'Last Name' },
  {
    name: 'fullName',
    type: 'text',
    label: 'Full Name (computed)',
    computeValue: (data: Record<string, unknown>) =>
      `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
  },
  { name: 'age', type: 'number', label: 'Age' },
  {
    name: 'contacts',
    type: 'group',
    label: 'Contacts',
    fields: [
      { name: 'email', type: 'text', label: 'Email' },
      { name: 'phone', type: 'text', label: 'Phone' },
    ],
    defaultItem: { email: '', phone: '' },
    minItems: 0,
    maxItems: 5,
  },
];

const legacyData = ref({});
const setLegacyData = (newData: any) => {
  legacyData.value = newData;
};

// 2. New Features fields
const newFields: FieldDescription[] = [
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
    name: 'city',
    type: 'select',
    label: '2. Thành phố (Dynamic theo Quốc gia)',
    options: (data: Record<string, any>) => {
      if (data.country === 'VN') {
        return [
          { label: 'Hà Nội', value: 'HN' },
          { label: 'TP. Hồ Chí Minh', value: 'HCM' },
          { label: 'Đà Nẵng', value: 'DN' },
        ];
      }
      if (data.country === 'US') {
        return [
          { label: 'New York', value: 'NY' },
          { label: 'Los Angeles', value: 'LA' },
          { label: 'Chicago', value: 'CHI' },
        ];
      }
      return [];
    },
    disabledCondition: (data: Record<string, any>) => !data.country,
    validate: validators.required('Vui lòng chọn thành phố'),
  },
  {
    name: 'email',
    type: 'text',
    label: '3. Email (Built-in Validators: required + email)',
    placeholder: 'example@domain.com',
    validate: validators.compose(
      validators.required('Email bắt buộc'),
      validators.email('Định dạng email không hợp lệ')
    ),
  },
  {
    name: 'username',
    type: 'text',
    label: '4. Username (Async validation)',
    placeholder: 'Nhập username (thử "admin")',
    validate: async (value: any) => {
      if (!value) return 'Username bắt buộc';
      if (String(value).toLowerCase() === 'admin') {
        return 'Tên "admin" đã tồn tại';
      }
      return undefined;
    },
  },
  {
    name: 'enableExtra',
    type: 'select',
    label: '5. Hiển thị trường bổ sung? (appearCondition)',
    options: [
      { label: 'Không', value: 'no' },
      { label: 'Có', value: 'yes' },
    ],
  },
  {
    name: 'note',
    type: 'text',
    label: 'Ghi chú thêm (Xuất hiện khi chọn "Có")',
    appearCondition: (data: Record<string, any>) => data.enableExtra === 'yes',
  },
  {
    name: 'lockAll',
    type: 'select',
    label: '6. Khóa trường số điện thoại? (disabledCondition)',
    options: [
      { label: 'Mở khóa', value: 'unlocked' },
      { label: 'Khóa (Disabled)', value: 'locked' },
    ],
  },
  {
    name: 'phone',
    type: 'text',
    label: 'Số điện thoại',
    disabledCondition: (data: Record<string, any>) => data.lockAll === 'locked',
  },
];

const newData = ref<Record<string, any>>({ country: 'VN' });
const errors = ref<Record<string, string[]>>({});
const validating = ref(false);

const setNewData = (updated: any) => {
  newData.value = updated;
  const res = validateFields(newFields, updated);
  errors.value = res.errors;
};

const handleValidate = async () => {
  validating.value = true;
  const res = await validateFieldsAsync(newFields, newData.value);
  errors.value = res.errors;
  validating.value = false;
};
</script>

<template>
  <main
    style="
      padding: 24px;
      max-width: 700px;
      margin: 0 auto;
      font-family: sans-serif;
    "
  >
    <!-- Navigation Tabs -->
    <nav
      style="
        display: flex;
        gap: 8px;
        margin-bottom: 24px;
        padding: 6px;
        background: #f0f4f8;
        border-radius: 8px;
      "
    >
      <button
        @click="activeTab = 'legacy'"
        :style="{
          padding: '8px 16px',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: activeTab === 'legacy' ? 'bold' : 'normal',
          backgroundColor: activeTab === 'legacy' ? '#fff' : 'transparent',
          boxShadow:
            activeTab === 'legacy' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        }"
      >
        📌 Demo Cơ Bản (Legacy)
      </button>
      <button
        @click="activeTab = 'new'"
        :style="{
          padding: '8px 16px',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: activeTab === 'new' ? 'bold' : 'normal',
          backgroundColor: activeTab === 'new' ? '#fff' : 'transparent',
          boxShadow: activeTab === 'new' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        }"
      >
        ✨ Demo Tính Năng Mới (v1.3+)
      </button>
    </nav>

    <!-- Tab 1: Legacy -->
    <div v-if="activeTab === 'legacy'">
      <h1 style="margin-bottom: 24px">Dynamic Field Kit Vue Demo</h1>
      <MultiFieldInput
        :fieldDescriptions="legacyFields"
        :properties="legacyData"
        :onChange="setLegacyData"
        :layout="{
          type: 'responsive',
          mobile: 'column',
          desktop: { type: 'grid', columns: 2, gap: 16 },
        }"
      />
      <div
        style="
          margin-top: 24px;
          padding: 16px;
          background-color: #f5f5f5;
          border-radius: 8px;
        "
      >
        <pre style="margin: 0">{{ JSON.stringify(legacyData, null, 2) }}</pre>
      </div>
    </div>

    <!-- Tab 2: New Features -->
    <div v-else>
      <h1 style="margin-bottom: 12px; font-size: 24px">
        Tính Năng Mới v1.3+ Engine (Vue)
      </h1>
      <p style="color: #666; margin-bottom: 24px; line-height: 1.5">
        Minh họa Built-in Validators (`required`, `email`, `compose`), Dynamic
        Options (tùy thuộc Quốc gia), Conditional Disabled & Appear, Async
        Validation.
      </p>

      <MultiFieldInput
        :fieldDescriptions="newFields"
        :properties="newData"
        :onChange="setNewData"
        :errors="errors"
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
          @click="handleValidate"
          :disabled="validating"
          style="
            padding: 10px 16px;
            background-color: #0066cc;
            color: #fff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
          "
        >
          {{
            validating ? 'Đang kiểm tra...' : 'Kiểm tra lỗi (Validate Fields)'
          }}
        </button>
      </div>

      <div
        style="
          margin-top: 24px;
          padding: 16px;
          background-color: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        "
      >
        <h3 style="margin: 0 0 8px 0; font-size: 16px">
          Current State (Data):
        </h3>
        <pre style="margin: 0; font-size: 13px">{{
          JSON.stringify(newData, null, 2)
        }}</pre>
        <div v-if="Object.keys(errors).length > 0">
          <h3 style="margin: 16px 0 8px 0; font-size: 16px; color: #ef4444">
            Validation Errors:
          </h3>
          <pre style="margin: 0; font-size: 13px; color: #ef4444">{{
            JSON.stringify(errors, null, 2)
          }}</pre>
        </div>
      </div>
    </div>
  </main>
</template>
