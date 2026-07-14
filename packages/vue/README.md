# @dynamic-field-kit/vue

Vue 3 adapter for `@dynamic-field-kit/core`.

This package provides Vue components that render `FieldDescription[]` and resolve field renderers through the shared registry used by `dynamic-field-kit`.

Demo app: https://github.com/vannt-dev/dynamic-field-kit-demo

## Install

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/vue vue
```

Note: @dynamic-field-kit/core is a shared runtime and should be installed in your app separately. The Vue adapter declares core as a peer dependency to avoid bundling core multiple times across adapters.

- Install with core: `npm install @dynamic-field-kit/core @dynamic-field-kit/vue vue`

## Exports

- `DynamicInput`
- `FieldInput`
- `MultiFieldInput`
- `layoutRegistry`
- `fieldRegistry`
- `FieldRegistry` (class, for scoped registries)
- `provideFieldRegistry` / `useFieldRegistry` / `FieldRegistryKey`
- `FieldDescription`
- `FieldTypeKey`
- `FieldRendererProps`
- `Properties`
- `LayoutConfig`

Default layouts are registered automatically when you import the package root.

Built-in layouts:

- `column`
- `row`
- `grid` (alias: `grid-2`)
- `responsive`

## Register field renderers

Register Vue renderers before rendering your form:

```ts
import { defineComponent, h } from 'vue';
import { fieldRegistry } from '@dynamic-field-kit/vue';

fieldRegistry.register(
  'text',
  defineComponent({
    name: 'TextFieldRenderer',
    props: {
      value: { type: String, default: '' },
      label: { type: String, default: '' },
    },
    emits: ['update:value'],
    setup(props, { emit }) {
      return () =>
        h('label', { style: { display: 'grid', gap: '4px' } }, [
          h('span', props.label),
          h('input', {
            value: props.value ?? '',
            onInput: (event: Event) => {
              emit('update:value', (event.target as HTMLInputElement).value);
            },
          }),
        ]);
    },
  })
);
```

## Basic usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MultiFieldInput } from '@dynamic-field-kit/vue';
import type { FieldDescription } from '@dynamic-field-kit/core';

const fields: FieldDescription[] = [
  { name: 'username', type: 'text', label: 'Username' },
  { name: 'email', type: 'text', label: 'Email' },
];

const formData = ref({});

function handleChange(data: Record<string, unknown>) {
  formData.value = data;
}
</script>

<template>
  <MultiFieldInput
    :fieldDescriptions="fields"
    :properties="formData"
    :onChange="handleChange"
  />
</template>
```

## Layouts

Use a layout name:

```vue
<MultiFieldInput :fieldDescriptions="fields" layout="grid" />
```

Use a layout config object:

```vue
<MultiFieldInput
  :fieldDescriptions="fields"
  :layout="{ type: 'grid', columns: 3, gap: 12 }"
/>
```

Use the built-in responsive layout:

```vue
<MultiFieldInput
  :fieldDescriptions="fields"
  :layout="{
    type: 'responsive',
    mobile: 'column',
    desktop: { type: 'grid', columns: 2, gap: 12 },
  }"
/>
```

Register a custom layout:

```ts
import { h } from 'vue';
import { layoutRegistry } from '@dynamic-field-kit/vue';

layoutRegistry.register('stack-tight', ({ children }) => {
  return h('div', { style: { display: 'grid', gap: '8px' } }, children);
});
```

## Derived fields with `computeValue`

Give a field a `computeValue` to derive its value from the rest of the form data whenever any field changes:

```ts
const fields: FieldDescription[] = [
  { name: 'firstName', type: 'text' },
  { name: 'lastName', type: 'text' },
  {
    name: 'fullName',
    type: 'text',
    computeValue: (data) =>
      `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
  },
];
```

## Repeatable field groups

A field with `fields` renders as a repeatable group: `data[name]` becomes an array of items, each shaped by the nested `fields`, with "Add"/"Remove" controls rendered automatically.

```ts
const fields: FieldDescription[] = [
  {
    name: 'contacts',
    type: 'group',
    label: 'Contacts',
    fields: [
      { name: 'email', type: 'text', label: 'Email' },
      { name: 'phone', type: 'text', label: 'Phone' },
    ],
    defaultItem: { email: '', phone: '' },
    keyField: 'id', // optional: stable list key instead of the array index
    minItems: 1,
    maxItems: 5,
  },
];
```

```vue
<MultiFieldInput :fieldDescriptions="fields" />
```

## Scoped registries

`fieldRegistry` is a process-wide singleton. To give a component subtree its own renderers, create an isolated `FieldRegistry` and provide it from a parent's `setup()` with `provideFieldRegistry`. Descendants that don't have a provider keep using the global singleton.

```ts
import { FieldRegistry, provideFieldRegistry } from '@dynamic-field-kit/vue';

// in a parent component's setup()
const registry = new FieldRegistry();
registry.register('text', MyTextRenderer);
provideFieldRegistry(registry);
```

## Type augmentation

```ts
import '@dynamic-field-kit/core';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
    number: number;
  }
}
```

## Notes

- `@dynamic-field-kit/core` owns the schema types and shared runtime registry.
- `@dynamic-field-kit/vue` is the package you should import when registering Vue renderers.
- `MultiFieldInput` filters fields using `appearCondition` and derives fields using `computeValue`.
- `DynamicInput` renders `Unknown field type: ...` when a renderer is missing.
- Fields with `fields` render as repeatable groups instead of going through `fieldRegistry`.

## License

MIT
