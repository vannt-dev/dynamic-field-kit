# @dynamic-field-kit/react

React adapter for `@dynamic-field-kit/core`.

This package provides React components for rendering `FieldDescription[]` and exports a React-typed `fieldRegistry`, so registered renderers can be used directly as JSX components.

Live demo: https://vannt-dev.github.io/dynamic-field-kit/react/ — plus
[enterprise features](https://vannt-dev.github.io/dynamic-field-kit/react/new-features/)
(`useDynamicForm`, HTML5 renderers, blur wiring, DevTools) and a
[multi-step wizard](https://vannt-dev.github.io/dynamic-field-kit/react/wizard/).

## Install

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/react react
```

Note: `@dynamic-field-kit/core`, `react`, and `react-dom` are **peer dependencies** — this adapter does not bundle or auto-install them, so add them to your app explicitly (as shown above). Keep a single `@dynamic-field-kit/core` version across all adapters so they share one registry.

## Exports

- `DynamicInput`
- `FieldInput`
- `MultiFieldInput`
- `useDynamicForm`
- `DynamicFormDevTools`
- `layoutRegistry`
- `fieldRegistry`
- `FieldRegistry` (class, for scoped registries)
- `FieldRegistryProvider` / `useFieldRegistry` / `FieldRegistryProviderProps`
- `ReactFieldRenderer`
- `ReactFieldRegistry`
- `FieldDescription`
- `FieldTypeKey`
- `FieldRendererProps`
- `LayoutConfig`
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

`FieldGroupInput` (repeatable field groups) is used internally by `FieldInput` and doesn't need to be imported directly - see "Repeatable field groups" below.

Default layouts are registered automatically when you import the package root.

Built-in layouts:

- `column`
- `row`
- `grid`
- `responsive`

## Register field renderers

Register React components or function components through the React adapter:

```tsx
import { fieldRegistry } from '@dynamic-field-kit/react';

fieldRegistry.register('text', ({ value, onValueChange, label }) => (
  <label style={{ display: 'grid', gap: 4 }}>
    <span>{label}</span>
    <input
      value={value ?? ''}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  </label>
));

fieldRegistry.register('number', ({ value, onValueChange, label }) => (
  <label style={{ display: 'grid', gap: 4 }}>
    <span>{label}</span>
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => onValueChange?.(Number(e.target.value))}
    />
  </label>
));
```

## Basic usage

```tsx
import { useState } from 'react';
import { MultiFieldInput } from '@dynamic-field-kit/react';
import type { FieldDescription } from '@dynamic-field-kit/core';

const fields: FieldDescription[] = [
  { name: 'name', type: 'text', label: 'Name' },
  { name: 'age', type: 'number', label: 'Age' },
];

export function Example() {
  const [data, setData] = useState({});

  return (
    <MultiFieldInput
      fieldDescriptions={fields}
      properties={data}
      onChange={setData}
    />
  );
}
```

## Form state (`useDynamicForm`)

Holds data, errors, touched and submission state for a set of fields. Vue's
composable and Angular's `createDynamicFormStore` expose the same surface.

```tsx
import { useDynamicForm, MultiFieldInput } from '@dynamic-field-kit/react';

const form = useDynamicForm({
  fields,
  initialValues: { country: 'VN' },
  validateOnBlur: true, // default
  validateOnChange: false, // default
});

<form onSubmit={form.handleSubmit((data) => save(data))}>
  <MultiFieldInput fieldDescriptions={fields} form={form} />
  <button disabled={form.isSubmitting}>
    {form.isSubmitting ? 'Saving…' : 'Save'}
  </button>
</form>;
```

`form` is shorthand for four props at once, and is the recommended wiring:

```tsx
<MultiFieldInput
  fieldDescriptions={fields}
  properties={form.data}
  onChange={form.handleChange}
  onBlurField={form.handleBlur} // touched + validateOnBlur
  touched={form.touched} // makes the hook the only source of truth
/>
```

Passing `touched` is what makes an invalid submit visible: `handleSubmit`
marks every field touched before validating, so a renderer that gates its error
on `touched` shows it even for fields the user never focused. `reset()` clears
touched the same way. Individually passed props win over the ones `form`
derives, so you can pass `form` and still override one wire.

| Member                              | Description                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `data`                              | Current form data, with `computeValue` fields applied                             |
| `errors`                            | `Record<string, string[]>`, keyed like `validateFields`                           |
| `isValid` / `isDirty`               | No errors recorded / any value has changed                                        |
| `isSubmitting` / `isSubmitted`      | In-flight submit / at least one submit attempted                                  |
| `touched`                           | Fields that have been blurred                                                     |
| `handleChange(data)`                | Replace the whole form data — pass to `MultiFieldInput`'s `onChange`              |
| `setFieldValue(name, value)`        | Change one field                                                                  |
| `handleBlur(name)`                  | Mark touched, and validate when `validateOnBlur`                                  |
| `setFieldTouched(name, value?)`     | Set touched explicitly                                                            |
| `touchAll()`                        | Mark every field touched — `handleSubmit` already calls it                        |
| `resetTouched()`                    | Clear touched only, leaving data/errors/dirty alone                               |
| `setTouched`                        | Raw setter for the whole touched map                                              |
| `setData`                           | Raw state setter, for escape hatches                                              |
| `validate()`                        | Validate now, returns a boolean                                                   |
| `reset(values?)`                    | Back to `initialValues` (or the values given), clearing errors/touched/submission |
| `handleSubmit(onValid, onInvalid?)` | Returns a submit handler; calls `preventDefault`, validates, then dispatches      |

Leave `touched` off and `MultiFieldInput` falls back to tracking it internally
from blur alone, as it always did. In that mode nothing outside the component
can clear it — a form that stays mounted across submits will keep showing the
errors of the previous round after `reset()` — so it exposes a ref for it:

```tsx
const ref = useRef<MultiFieldInputHandle>(null);

<MultiFieldInput ref={ref} fieldDescriptions={fields} />;
// after a successful submit
ref.current?.resetTouched();
```

`resetTouched()`, `setFieldTouched(name, value?)` and `getTouched()` are the
handle's members. Controlled mode needs none of them: `form.reset()` covers it.

## Field ids

Each field renders with `id={`${idPrefix}-${name}`}`, where `idPrefix` defaults
to a value unique to the `MultiFieldInput` instance (from `useId`, so server and
client agree). Two forms containing a field of the same name therefore no longer
emit the same DOM id twice.

```tsx
// pinned ids — reproduces the pre-1.6 `dfk-field-title`
<MultiFieldInput fieldDescriptions={fields} idPrefix="dfk-field" />
```

For one field, set `id` on its `FieldDescription`; it wins over the prefix.
Renderers receive the resolved value as the `id` prop, so a `<label htmlFor>` in
a renderer points at exactly one input.

## Default renderers

`text` · `number` · `password` · `email` · `textarea` · `checkbox` · `select` ·
`radio` · `range` · `file` · `date` · `time` · `datetime-local` · `switch`

Any type you have not registered falls back to one of these. Reach the map
directly if you need to wrap or inspect a default:

```ts
import {
  defaultRenderersMap,
  getDefaultRenderer,
} from '@dynamic-field-kit/react';

const Base = getDefaultRenderer('date'); // undefined for an unknown type
```

`file` emits a `File` (or `File[]` when `multiple` is set), `range` and `number`
emit numbers, `checkbox` / `switch` emit booleans; everything else emits strings.

## DevTools

```tsx
import { DynamicFormDevTools } from '@dynamic-field-kit/react';

<DynamicFormDevTools
  data={form.data}
  errors={form.errors}
  touched={form.touched}
  isDirty={form.isDirty}
  fields={fields}
  position="bottom-right" // or "bottom-left"
/>;
```

A floating overlay with data / errors / meta / fields tabs. The collapsed
button carries a red badge with the number of fields in error.

## Layouts

Use a layout name:

```tsx
<MultiFieldInput fieldDescriptions={fields} layout="grid" />
```

Use a layout config object:

```tsx
<MultiFieldInput
  fieldDescriptions={fields}
  layout={{ type: 'grid', columns: 3, gap: 16 }}
/>
```

Use the built-in responsive layout:

```tsx
<MultiFieldInput
  fieldDescriptions={fields}
  layout={{
    type: 'responsive',
    mobile: 'column',
    desktop: { type: 'grid', columns: 2, gap: 12 },
  }}
/>
```

Register a custom layout:

```tsx
import { layoutRegistry } from '@dynamic-field-kit/react';

layoutRegistry.register('stack-tight', ({ children }) => (
  <div style={{ display: 'grid', gap: 8 }}>{children}</div>
));
```

## Derived fields with `computeValue`

Give a field a `computeValue` to derive its value from the rest of the form data whenever any field changes:

```tsx
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
your renderer receives `error`, `disabled`, and `readOnly`. `MultiFieldInput`
emits `onValidityChange`:

```tsx
<MultiFieldInput
  fieldDescriptions={fields}
  properties={data}
  onChange={setData}
  onValidityChange={({ valid, errors }) => setCanSubmit(valid)}
/>
```

Read the props inside a renderer:

```tsx
fieldRegistry.register('text', ({ value, onValueChange, error, disabled }) => (
  <label>
    <input
      disabled={disabled}
      value={value ?? ''}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
    {error && <span className="error">{[].concat(error).join(', ')}</span>}
  </label>
));
```

## Repeatable field groups

A field with `fields` renders as a repeatable group: `data[name]` becomes an array of items, each shaped by the nested `fields`, with "Add"/"Remove" controls rendered automatically.

```tsx
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

<MultiFieldInput fieldDescriptions={fields} />;
```

## Scoped registries

`fieldRegistry` is a process-wide singleton. To give a subtree its own renderers, create an isolated `FieldRegistry` and wrap the subtree in `FieldRegistryProvider`. Anything not wrapped keeps using the global singleton.

```tsx
import {
  FieldRegistry,
  FieldRegistryProvider,
  MultiFieldInput,
} from '@dynamic-field-kit/react';

const registry = new FieldRegistry();
registry.register('text', MyTextRenderer);

<FieldRegistryProvider registry={registry}>
  <MultiFieldInput fieldDescriptions={fields} />
</FieldRegistryProvider>;
```

## Type augmentation

Add your app's field types through module augmentation:

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

- `@dynamic-field-kit/core` stays framework-agnostic and does not export React-specific JSX types.
- `@dynamic-field-kit/react` narrows the shared registry to React component types so `fieldRegistry.get(type)` can be rendered safely in TSX.
- `MultiFieldInput` filters fields using `appearCondition` and derives fields using `computeValue`.
- `DynamicInput` renders `Unknown field type: ...` when a renderer is missing.
- Fields with `fields` render as repeatable groups instead of going through `fieldRegistry`.

## License

MIT
