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
- `FieldDescription`
- `FieldTypeKey`
- `FieldRendererProps`
- `Properties`
- `LayoutConfig`

Default layouts are registered automatically when you import the package root.

Built-in layouts:

- `column`
- `row`
- `grid`
- `grid-2`

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

Register a custom layout:

```ts
import { h } from 'vue';
import { layoutRegistry } from '@dynamic-field-kit/vue';

layoutRegistry.register('stack-tight', ({ children }) => {
  return h('div', { style: { display: 'grid', gap: '8px' } }, children);
});
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
- `MultiFieldInput` filters fields using `appearCondition`.
- `DynamicInput` renders `Unknown field type: ...` when a renderer is missing.

## License

MIT
