# @dynamic-field-kit/react

React adapter for `@dynamic-field-kit/core`.

This package provides React components for rendering `FieldDescription[]` and exports a React-typed `fieldRegistry`, so registered renderers can be used directly as JSX components.

Demo app: https://github.com/vannt-dev/dynamic-field-kit-demo

## Install

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/react react
```

Note: `@dynamic-field-kit/core`, `react`, and `react-dom` are **peer dependencies** — this adapter does not bundle or auto-install them, so add them to your app explicitly (as shown above). Keep a single `@dynamic-field-kit/core` version across all adapters so they share one registry.

## Exports

- `DynamicInput`
- `FieldInput`
- `MultiFieldInput`
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
- `validateField` / `validateFields` / `resolveDisabled` / `resolveReadOnly` / `ValidationResult`

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
