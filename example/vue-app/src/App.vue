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
import { lang, setLang, t } from '../../shared/i18n';

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
    label: t('Basics'),
    title: 'Dynamic Field Kit — Vue',
    intro: t(
      'Registering renderers with fieldRegistry, MultiFieldInput, layouts, computed fields (computeValue) and repeatable groups.',
    ),
  },
  {
    id: 'new',
    label: 'Validation',
    title: t('Validators, dynamic options and conditions'),
    intro: t(
      'Built-in validators (required, email, compose), options that depend on another field, appearCondition / disabledCondition and async validation.',
    ),
  },
  {
    id: 'enterprise',
    label: 'Form state',
    title: t('Form state with useDynamicForm'),
    intro: t(
      'The composable owns data, errors, touched and submit state; DynamicFormDevTools sits in the corner.',
    ),
    source: enterpriseSource,
    sourcePath: 'src/demos/EnterpriseDemo.vue',
  },
  {
    id: 'wizard',
    label: 'Wizard',
    title: 'Multi-Step Wizard',
    intro: t(
      'createWizardState, validateStep, goNext / goPrev. State is immutable: every navigation returns a new state.',
    ),
    source: wizardSource,
    sourcePath: 'src/demos/WizardDemo.vue',
  },
  {
    id: 'schema',
    label: 'JSON Schema + Undo',
    title: t('JSON Schema, drafts and Undo / Redo'),
    intro: t(
      'fieldsFromJsonSchema builds the form from a JSON Schema, createFormDraft keeps the data across reloads, createFormHistory gives undo / redo.',
    ),
    source: schemaSource,
    sourcePath: 'src/demos/SchemaFormDemo.vue',
  },
];

const current = computed(() => TABS.find((tab) => tab.id === activeTab.value)!);
const hasSource = computed(() => Boolean(current.value.source));

// 1. Legacy fields
const legacyFields: FieldDescription[] = [
  { name: 'firstName', type: 'text', label: t('First Name') },
  { name: 'lastName', type: 'text', label: t('Last Name') },
  {
    name: 'fullName',
    type: 'text',
    label: t('Full Name (computed)'),
    computeValue: (data: Record<string, unknown>) =>
      `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
  },
  { name: 'age', type: 'number', label: t('Age') },
  {
    name: 'contacts',
    type: 'group',
    label: t('Contacts'),
    addLabel: t('Add'),
    removeLabel: t('Remove'),
    className: 'demo-group',
    fields: [
      { name: 'email', type: 'text', label: t('Email') },
      { name: 'phone', type: 'text', label: t('Phone') },
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
    label: t('Country'),
    options: [
      { label: t('Vietnam'), value: 'VN' },
      { label: t('United States'), value: 'US' },
    ],
    validate: validators.required(t('Please choose a country')),
  },
  {
    name: 'city',
    type: 'select',
    label: t('City'),
    options: (data: Record<string, any>) => {
      if (data.country === 'VN') {
        return [
          { label: t('Hanoi'), value: 'HN' },
          { label: t('Ho Chi Minh City'), value: 'HCM' },
          { label: t('Da Nang'), value: 'DN' },
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
    validate: validators.required(t('Please choose a city')),
  },
  {
    name: 'email',
    type: 'text',
    label: t('Email'),
    placeholder: 'example@domain.com',
    validate: validators.compose(
      validators.required(t('Email is required')),
      validators.email(t('Invalid email format')),
    ),
  },
  {
    name: 'username',
    type: 'text',
    label: 'Username',
    placeholder: t('Enter a username (try "admin")'),
    validate: async (value: any) => {
      if (!value) return t('Username is required');
      if (String(value).toLowerCase() === 'admin') {
        return t('The name "admin" is taken');
      }
      return undefined;
    },
  },
  {
    name: 'enableExtra',
    type: 'select',
    label: t('Show the extra field?'),
    options: [
      { label: t('No'), value: 'no' },
      { label: t('Yes'), value: 'yes' },
    ],
  },
  {
    name: 'note',
    type: 'text',
    label: t('Extra note (appears when "Yes" is chosen)'),
    appearCondition: (data: Record<string, any>) => data.enableExtra === 'yes',
  },
  {
    name: 'lockAll',
    type: 'select',
    label: t('Lock the phone number field?'),
    options: [
      { label: t('Unlocked'), value: 'unlocked' },
      { label: t('Locked (disabled)'), value: 'locked' },
    ],
  },
  {
    name: 'phone',
    type: 'text',
    label: t('Phone number'),
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
      <span class="demo-lang" role="group" aria-label="Language">
        <button
          type="button"
          :aria-pressed="lang === 'en'"
          @click="setLang('en')"
        >
          EN
        </button>
        <button
          type="button"
          :aria-pressed="lang === 'vi'"
          @click="setLang('vi')"
        >
          VI
        </button>
      </span>
      <a :href="ALL_DEMOS_URL" class="demo-tab">
        {{ t('← All demos') }}
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
        {{ showCode ? t('Hide code') : t('View code') }}
      </button>
    </div>

    <div :class="['demo-split', { 'demo-split--code': showCode && hasSource }]">
      <section class="demo-card">
        <!-- Basics -->
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
            <h3>{{ t('Form data') }}</h3>
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
              {{ validating ? t('Checking…') : t('Check for errors') }}
            </button>
          </div>
          <div class="demo-panel">
            <h3>{{ t('Form data') }}</h3>
            <pre>{{ JSON.stringify(newData, null, 2) }}</pre>
          </div>
          <div
            v-if="Object.keys(errors).length > 0"
            class="demo-panel demo-panel--danger"
          >
            <h3>{{ t('Validation errors') }}</h3>
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
