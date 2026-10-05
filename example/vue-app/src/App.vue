<script setup lang="ts">
import { type FieldDescription, MultiFieldInput } from '@dynamic-field-kit/vue';
import {
  validators,
  validateFields,
  validateFieldsAsync,
} from '@dynamic-field-kit/core';
import { computed, ref } from 'vue';
import './lib/fieldRegistry';

import EnterpriseDemo from './demos/EnterpriseDemo.vue';
import WizardDemo from './demos/WizardDemo.vue';
import SchemaFormDemo from './demos/SchemaFormDemo.vue';
// Vite resolves `?raw` natively, so the panel shows the file that is running.
import enterpriseSource from './demos/EnterpriseDemo.vue?raw';
import wizardSource from './demos/WizardDemo.vue?raw';
import schemaSource from './demos/SchemaFormDemo.vue?raw';

type Tab = 'legacy' | 'new' | 'enterprise' | 'wizard' | 'schema';

const activeTab = ref<Tab>('legacy');
const showCode = ref(false);

// The landing page only exists on the deployed site, one level above this
// app's base path, so link to it absolutely.
const ALL_DEMOS_URL = 'https://vannt-dev.github.io/dynamic-field-kit/';

const TABS: {
  id: Tab;
  label: string;
  title: string;
  intro: string;
  source?: string;
  sourcePath?: string;
}[] = [
  {
    id: 'legacy',
    label: 'Cơ bản',
    title: 'Dynamic Field Kit — Vue',
    intro:
      'Đăng ký renderer qua fieldRegistry, MultiFieldInput, layout, trường dẫn xuất (computeValue) và nhóm lặp lại.',
  },
  {
    id: 'new',
    label: 'Validation',
    title: 'Validators, options động và điều kiện',
    intro:
      'Built-in validators (required, email, compose), options phụ thuộc trường khác, appearCondition / disabledCondition và async validation.',
  },
  {
    id: 'enterprise',
    label: 'Form state',
    title: 'Form state với useDynamicForm',
    intro:
      'Composable giữ data, errors, touched và trạng thái submit; DynamicFormDevTools ở góc màn hình.',
    source: enterpriseSource,
    sourcePath: 'src/demos/EnterpriseDemo.vue',
  },
  {
    id: 'wizard',
    label: 'Wizard',
    title: 'Multi-Step Wizard',
    intro:
      'createWizardState, validateStep, goNext / goPrev. State là bất biến — mỗi lần điều hướng trả về một state mới.',
    source: wizardSource,
    sourcePath: 'src/demos/WizardDemo.vue',
  },
  {
    id: 'schema',
    label: 'JSON Schema + Undo',
    title: 'JSON Schema, bản nháp và Undo / Redo',
    intro:
      'fieldsFromJsonSchema dựng form từ một JSON Schema, createFormDraft giữ dữ liệu qua lần tải lại trang, createFormHistory cho undo / redo.',
    source: schemaSource,
    sourcePath: 'src/demos/SchemaFormDemo.vue',
  },
];

const current = computed(() => TABS.find((tab) => tab.id === activeTab.value)!);
const hasSource = computed(() => Boolean(current.value.source));

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
    className: 'demo-group',
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
    label: 'Quốc gia',
    options: [
      { label: 'Việt Nam', value: 'VN' },
      { label: 'Hoa Kỳ (USA)', value: 'US' },
    ],
    validate: validators.required('Vui lòng chọn quốc gia'),
  },
  {
    name: 'city',
    type: 'select',
    label: 'Thành phố',
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
    label: 'Email',
    placeholder: 'example@domain.com',
    validate: validators.compose(
      validators.required('Email bắt buộc'),
      validators.email('Định dạng email không hợp lệ'),
    ),
  },
  {
    name: 'username',
    type: 'text',
    label: 'Username',
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
    label: 'Hiển thị trường bổ sung?',
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
    label: 'Khóa trường số điện thoại?',
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
const newTouched = ref<Record<string, boolean>>({});
const validating = ref(false);

const setNewData = (updated: any) => {
  newData.value = updated;
  const res = validateFields(newFields, updated);
  errors.value = res.errors;
};

const handleValidate = async () => {
  validating.value = true;
  // Checking the whole form marks every field as visited.
  newTouched.value = Object.fromEntries(
    newFields.map((field) => [field.name, true]),
  );
  const res = await validateFieldsAsync(newFields, newData.value);
  errors.value = res.errors;
  validating.value = false;
};
</script>

<template>
  <main :class="['demo', { 'demo--wide': showCode && hasSource }]">
    <nav class="demo-nav" aria-label="Demo pages">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        type="button"
        class="demo-tab"
        :aria-current="activeTab === tab.id ? 'page' : undefined"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
      <a :href="ALL_DEMOS_URL" class="demo-tab demo-nav__home">
        ← Tất cả demo
      </a>
    </nav>

    <div class="demo-head">
      <div>
        <h1>{{ current.title }}</h1>
        <p class="demo-intro">{{ current.intro }}</p>
      </div>
      <button
        v-if="hasSource"
        type="button"
        class="btn"
        :aria-pressed="showCode"
        style="flex-shrink: 0"
        @click="showCode = !showCode"
      >
        {{ showCode ? 'Ẩn code' : 'Xem code' }}
      </button>
    </div>

    <div :class="['demo-split', { 'demo-split--code': showCode && hasSource }]">
      <section class="demo-card">
        <!-- Cơ bản -->
        <template v-if="activeTab === 'legacy'">
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
          <div class="demo-panel">
            <h3>Dữ liệu form</h3>
            <pre>{{ JSON.stringify(legacyData, null, 2) }}</pre>
          </div>
        </template>

        <!-- Validation -->
        <template v-else-if="activeTab === 'new'">
          <MultiFieldInput
            :fieldDescriptions="newFields"
            :properties="newData"
            :onChange="setNewData"
            :errors="errors"
            :touched="newTouched"
            :on-blur-field="
              (name: string) => (newTouched = { ...newTouched, [name]: true })
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
              class="btn btn--primary"
              :disabled="validating"
              @click="handleValidate"
            >
              {{ validating ? 'Đang kiểm tra...' : 'Kiểm tra lỗi' }}
            </button>
          </div>
          <div class="demo-panel">
            <h3>Dữ liệu form</h3>
            <pre>{{ JSON.stringify(newData, null, 2) }}</pre>
          </div>
          <div
            v-if="Object.keys(errors).length > 0"
            class="demo-panel demo-panel--danger"
          >
            <h3>Lỗi kiểm tra</h3>
            <pre>{{ JSON.stringify(errors, null, 2) }}</pre>
          </div>
        </template>

        <EnterpriseDemo v-else-if="activeTab === 'enterprise'" />
        <WizardDemo v-else-if="activeTab === 'wizard'" />
        <SchemaFormDemo v-else />
      </section>

      <aside v-if="showCode && hasSource" class="demo-code">
        <div class="demo-code__bar">
          <span>{{ current.sourcePath }}</span>
        </div>
        <pre>{{ current.source }}</pre>
      </aside>
    </div>
  </main>
</template>
