<script setup lang="ts">
import { type FieldDescription, MultiFieldInput } from '@dynamic-field-kit/vue';
import { ref } from 'vue';
import './lib/fieldRegistry';

const fields: FieldDescription[] = [
  { name: 'firstName', type: 'text', label: 'First Name' },
  { name: 'lastName', type: 'text', label: 'Last Name' },
  {
    name: 'fullName',
    type: 'text',
    label: 'Full Name (computed)',
    // Derived from the two fields above whenever either one changes.
    computeValue: (data: Record<string, unknown>) =>
      `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
  },
  { name: 'age', type: 'number', label: 'Age' },
  {
    name: 'contacts',
    type: 'group',
    label: 'Contacts',
    // Repeatable field group: data.contacts becomes an array of items shaped
    // by these sub-fields, with Add/Remove controls rendered automatically.
    fields: [
      { name: 'email', type: 'text', label: 'Email' },
      { name: 'phone', type: 'text', label: 'Phone' },
    ],
    defaultItem: { email: '', phone: '' },
    minItems: 0,
    maxItems: 5,
  },
];

const data = ref({});

const setData = (newData: any) => {
  data.value = newData;
};
</script>

<template>
  <main
    style="
      padding: 24px;
      max-width: 600px;
      margin: 0 auto;
      font-family: sans-serif;
    "
  >
    <h1 style="margin-bottom: 24px">Dynamic Field Kit Vue Demo</h1>
    <MultiFieldInput
      :fieldDescriptions="fields"
      :properties="data"
      :onChange="setData"
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
      <pre style="margin: 0">{{ JSON.stringify(data, null, 2) }}</pre>
    </div>
  </main>
</template>
