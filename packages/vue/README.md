# @dynamic-field-kit/vue

Vue 3 adapter for `@dynamic-field-kit/core`.

This package provides Vue components that render `FieldDescription[]` and resolve field renderers through the shared registry used by `dynamic-field-kit`.

Live demo: https://vannt-dev.github.io/dynamic-field-kit/vue/ — tabs for the
basic schema, the enterprise features (`useDynamicForm`, HTML5 renderers, blur
wiring, DevTools) and the multi-step wizard.

## Install

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/vue vue
```

Note: `@dynamic-field-kit/core` and `vue` are **peer dependencies** — this adapter does not bundle or auto-install them, so add them to your app explicitly (as shown above). Keep a single `@dynamic-field-kit/core` version across all adapters so they share one registry.

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
- `useDynamicForm`
- `DynamicFormDevTools`
- `defaultRenderersMap` / `getDefaultRenderer`

Re-exported from `@dynamic-field-kit/core` so a consumer app rarely has to import
both packages:

- `validateField` / `validateFieldAsync` — one field, returns `string[]`
- `validateFields` / `validateFieldsAsync` — a whole schema, returns `ValidationResult`
- `resolveDisabled` / `resolveReadOnly` / `resolveOptions` — resolve a field's dynamic conditions and options
- `validators` — the built-in validator helpers (`required`, `email`, `minLength`, `compose`, …)
- `ValidationResult`

`useDynamicForm` validates **synchronously** via `validateFields`, including on
submit. Fields whose `validate` hook returns a Promise are treated as valid on
that path, so run async rules through `validateFieldsAsync` yourself. See the
[core README](https://github.com/vannt-dev/dynamic-field-kit/tree/develop/packages/core#sync-vs-async-validation)
for the full rules.

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
  }),
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

## Form state (`useDynamicForm`)

Holds data, errors, touched and submission state for a set of fields. Everything
is a `ref` (or `computed`), so read through `.value` in `<script setup>`.

```vue
<script setup lang="ts">
import { useDynamicForm, MultiFieldInput } from '@dynamic-field-kit/vue';

const form = useDynamicForm({
  fields,
  initialValues: { country: 'VN' },
  validateOnBlur: true, // default
  validateOnChange: false, // default
});

const onSubmit = form.handleSubmit((data) => save(data));
</script>

<template>
  <form @submit="onSubmit">
    <MultiFieldInput :field-descriptions="fields" :form="form" />
    <button :disabled="form.isSubmitting.value">Save</button>
  </form>
</template>
```

`:form` is shorthand for four props at once, and is the recommended wiring:

```vue
<MultiFieldInput
  :field-descriptions="fields"
  :properties="form.data.value"
  :on-change="form.handleChange"
  :on-blur-field="form.handleBlur"
  :touched="form.touched.value"
/>
```

Passing `touched` is what makes an invalid submit visible: `handleSubmit` marks
every field touched before validating, so a renderer that gates its error on
`touched` shows it even for fields the user never focused. `reset()` clears
touched the same way. Individually passed props win over the ones `form`
derives.

| Member                              | Description                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `data`                              | `Ref` of the form data, with `computeValue` fields applied                        |
| `errors`                            | `Ref<Record<string, string[]>>`, keyed like `validateFields`                      |
| `isValid` / `isDirty`               | `computed` / `Ref`                                                                |
| `isSubmitting` / `isSubmitted`      | In-flight submit / at least one submit attempted                                  |
| `touched`                           | Fields that have been blurred                                                     |
| `handleChange(data)`                | Replace the whole form data — pass to `MultiFieldInput`'s `onChange`              |
| `setFieldValue(name, value)`        | Change one field                                                                  |
| `handleBlur(name)`                  | Mark touched, and validate when `validateOnBlur`                                  |
| `setFieldTouched(name, value?)`     | Set touched explicitly                                                            |
| `touchAll()`                        | Mark every field touched — `handleSubmit` already calls it                        |
| `resetTouched()`                    | Clear touched only, leaving data/errors/dirty alone                               |
| `validate()`                        | Validate now, returns a boolean                                                   |
| `reset(values?)`                    | Back to `initialValues` (or the values given), clearing errors/touched/submission |
| `handleSubmit(onValid, onInvalid?)` | Returns a submit handler; calls `preventDefault`, validates, then dispatches      |

`onBlurField` is what connects `handleBlur` — and therefore `touched` and
`validateOnBlur` — to the rendered form.

Leave `touched` off and `MultiFieldInput` falls back to tracking it internally
from blur alone, as it always did. In that mode nothing outside the component
can clear it, so it exposes `resetTouched()`, `setFieldTouched(name, value?)`
and `getTouched()` on its instance:

```vue
<MultiFieldInput ref="formRef" :field-descriptions="fields" />
<script setup>
const formRef = ref();
// after a successful submit
formRef.value.resetTouched();
</script>
```

## Field ids

Each field renders with ``id={`${idPrefix}-${name}`}``, where `idPrefix`
defaults to a value unique to the `MultiFieldInput` instance. Two forms
containing a field of the same name therefore no longer emit the same DOM id
twice.

```vue
<!-- pinned ids — reproduces the pre-1.6 `dfk-field-title` -->
<MultiFieldInput :field-descriptions="fields" id-prefix="dfk-field" />
```

For one field, set `id` on its `FieldDescription`; it wins over the prefix.

## Default renderers

`text` · `number` · `password` · `email` · `textarea` · `checkbox` · `select` ·
`radio` · `range` · `file` · `date` · `time` · `datetime-local` · `switch`

Any type you have not registered falls back to one of these.

```ts
import {
  defaultRenderersMap,
  getDefaultRenderer,
} from '@dynamic-field-kit/vue';

const Base = getDefaultRenderer('date'); // undefined for an unknown type
```

`file` emits a `File` (or `File[]` when `multiple` is set), `range` and `number`
emit numbers, `checkbox` / `switch` emit booleans; everything else emits strings.

## DevTools

```vue
<DynamicFormDevTools
  :data="form.data.value"
  :errors="form.errors.value"
  :touched="form.touched.value"
  :is-dirty="form.isDirty.value"
  :fields="fields"
  position="bottom-right"
/>
```

A floating overlay with data / errors / meta / fields tabs. The collapsed
button carries a red badge with the number of fields in error.

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

## Validation & conditions

Declare a `validate` hook and dynamic `disabledCondition`/`readOnlyCondition`;
your renderer receives `error`, `disabled`, and `readOnly`, and `MultiFieldInput`
emits `onValidityChange`:

```vue
<MultiFieldInput
  :fieldDescriptions="fields"
  :properties="formData"
  :onChange="handleChange"
  :onValidityChange="({ valid }) => (canSubmit = valid)"
/>
```

A renderer reads the props (`error`, `disabled`, `readOnly`) it declares, the
same way it reads `value`/`label`.

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
