# @dynamic-field-kit/core

Core types and shared registries for `dynamic-field-kit`.

`@dynamic-field-kit/core` is intentionally framework-agnostic. It does not import React, Vue, or Angular types in its public API. Applications define field schemas in `core`, then register framework-specific renderers through an adapter package such as `@dynamic-field-kit/react`, `@dynamic-field-kit/vue`, or `@dynamic-field-kit/angular`.

Demo app: https://github.com/vannt-dev/dynamic-field-kit-demo

## What this package provides

- `FieldDescription` for schema-driven field definitions
- `FieldRendererProps` as the shared renderer contract
- `FieldTypeMap` for module augmentation and custom field typing
- `fieldRegistry` as the shared runtime registry instance
- `applyComputedValues` to resolve `computeValue` fields against form data
- `isFieldGroup`, `createGroupItem`, `canAddGroupItem`, `canRemoveGroupItem` to work with repeatable field groups (`FieldDescription.fields`)

## Install

```bash
npm install @dynamic-field-kit/core
```

Note: This package is framework-agnostic. To render forms in an application, install a framework adapter as well (for example, @dynamic-field-kit/react, @dynamic-field-kit/vue, or @dynamic-field-kit/angular).

- Example: npm install @dynamic-field-kit/core @dynamic-field-kit/react
- Or: npm install @dynamic-field-kit/core @dynamic-field-kit/vue
- Or: npm install @dynamic-field-kit/core @dynamic-field-kit/angular

- Core is intended to be a single source of truth for registry and types. Ensure your app uses a single version of @dynamic-field-kit/core to avoid multiple registry instances.

Install a UI adapter alongside it when rendering forms:

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/react
# or
npm install @dynamic-field-kit/core @dynamic-field-kit/vue
# or
npm install @dynamic-field-kit/core @dynamic-field-kit/angular
```

## Core idea

The library does not hard-code field types like `"text" | "number"`.

Instead, apps extend `FieldTypeMap`:

```ts
export interface FieldTypeMap {}
```

That keeps the package open for custom field types without modifying the library.

## Define field types in your app

Create a declaration file such as `src/types/dynamic-field-kit.d.ts`:

```ts
import '@dynamic-field-kit/core';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
    number: number;
    checkbox: boolean;
    select: string;
  }
}
```

Make sure that file is included by your app's `tsconfig.json`.

## Shared types

```ts
export interface FieldRendererProps<T = any> {
  value?: T;
  onValueChange?: (value: T) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: Record<string, any>[];
  className?: string;
  description?: any;
}
```

```ts
export interface FieldDescription<T extends FieldTypeKey = FieldTypeKey> {
  name: string;
  type: T;
  label?: string;
  placeholder?: string;
  required?: boolean;
  appearCondition?: (data: Record<string, any>) => boolean;
  computeValue?: (data: Record<string, any>) => unknown;
  options?: Record<string, any>[];
  className?: string;
  description?: any;
  // Repeatable field group (see "Repeatable field groups" below)
  fields?: FieldDescription[];
  defaultItem?: Record<string, any>;
  minItems?: number;
  maxItems?: number;
  addLabel?: string;
  removeLabel?: string;
}
```

## Derived fields with `computeValue`

`computeValue` derives a field's value from the rest of the form data (e.g. a `fullName` computed from `firstName` + `lastName`). Every adapter's `MultiFieldInput` re-evaluates it once per change, against the post-change data - it is not re-run to a fixed point, so avoid chaining `computeValue` fields into a cycle.

```ts
import { applyComputedValues } from '@dynamic-field-kit/core';

const fields: FieldDescription[] = [
  { name: 'firstName', type: 'text' },
  { name: 'lastName', type: 'text' },
  {
    name: 'fullName',
    type: 'text',
    computeValue: (data) => `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
  },
];

applyComputedValues(fields, { firstName: 'Ada', lastName: 'Lovelace' });
// => { firstName: 'Ada', lastName: 'Lovelace', fullName: 'Ada Lovelace' }
```

Adapters call `applyComputedValues` for you whenever `MultiFieldInput`'s data changes; you normally only need to import it directly when working with form data outside of a component (e.g. on submit).

## Repeatable field groups

A `FieldDescription` with `fields` becomes a repeatable group instead of a registry-rendered leaf field: `data[name]` becomes an array of items, each shaped by the nested `fields`. Every adapter's `MultiFieldInput` renders one nested form per item plus "Add"/"Remove" controls automatically - no adapter-specific wiring required.

```ts
const fields: FieldDescription[] = [
  {
    name: 'contacts',
    type: 'group', // any type key works; only `fields` matters for grouping
    label: 'Contacts',
    fields: [
      { name: 'email', type: 'text', label: 'Email' },
      { name: 'phone', type: 'text', label: 'Phone' },
    ],
    defaultItem: { email: '', phone: '' }, // seed values for a new item
    minItems: 1,
    maxItems: 5,
  },
];
```

The `isFieldGroup`, `createGroupItem`, `canAddGroupItem`, and `canRemoveGroupItem` helpers back this feature and are exported for adapters (or apps) that need to replicate the same add/remove bounds logic outside of `MultiFieldInput`.

## Register renderers through an adapter

`core` owns the shared registry instance, but renderer registration should happen through the framework adapter so the adapter can expose the correct renderer type for that framework.

Typical adapter imports:

```ts
import { fieldRegistry as reactRegistry } from '@dynamic-field-kit/react';
import { fieldRegistry as vueRegistry } from '@dynamic-field-kit/vue';
import { fieldRegistry as angularRegistry } from '@dynamic-field-kit/angular';
```

Then register a renderer using the adapter that matches your UI framework.

React:

```tsx
import { fieldRegistry } from '@dynamic-field-kit/react';

fieldRegistry.register('text', ({ value, onValueChange, label }) => (
  <label>
    <span>{label}</span>
    <input
      value={value ?? ''}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  </label>
));
```

Vue:

```ts
import { defineComponent, h } from 'vue';
import { fieldRegistry } from '@dynamic-field-kit/vue';

fieldRegistry.register(
  'text',
  defineComponent({
    setup() {
      return () => h('input');
    },
  })
);
```

Angular:

```ts
import { fieldRegistry } from '@dynamic-field-kit/angular';
import { TextFieldComponent } from './text-field.component';

fieldRegistry.register('text', TextFieldComponent as any);
```

## Example schema

```ts
import type { FieldDescription } from '@dynamic-field-kit/core';

const fields: FieldDescription[] = [
  { name: 'username', type: 'text', label: 'Username' },
  {
    name: 'age',
    type: 'number',
    label: 'Age',
    appearCondition: (data) => Boolean(data.username),
  },
];
```

## Notes

- `core` is runtime-shared across adapters.
- `core` does not ship UI components.
- The registry stores framework-specific renderers, but the framework-specific typing belongs in each adapter package.

## Related packages

- `@dynamic-field-kit/react`
- `@dynamic-field-kit/vue`
- `@dynamic-field-kit/angular`

## License

MIT
