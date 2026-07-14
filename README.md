# Dynamic Field Kit

[![CI](https://github.com/vannt-dev/dynamic-field-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/vannt-dev/dynamic-field-kit/actions/workflows/ci.yml)

A lightweight, extensible **dynamic form engine** for React, Angular, and Vue, built for scalable applications and design systems.

`dynamic-field-kit` lets you define forms using **configuration objects** instead of hard-coded UI, and allows applications to **freely extend field types** across frameworks without modifying the library. Register custom renderers in React, Angular, or vanilla JS using a shared field registry.

---

## ✨ Features

- Schema-driven dynamic forms
- Extensible field types (no enums, no hard-coded unions)
- Pluggable field renderers via shared registry
- Runtime conditional fields (`appearCondition`)
- Derived/computed fields (`computeValue`)
- Repeatable field groups (`fields`) - "add another item" without leaving the schema
- Responsive layouts (mobile/desktop) with custom breakpoints
- Clean TypeScript declarations (DTS-safe)
- Framework-agnostic core (works with React, Angular, Vue, or vanilla JS)
- Ideal for form builders & design systems

---

## 📦 Packages

| Package                      | Description                                                  |
| ---------------------------- | ------------------------------------------------------------ |
| `@dynamic-field-kit/core`    | Core types and shared field registry                         |
| `@dynamic-field-kit/react`   | React components (FieldInput, MultiFieldInput, DynamicInput) |
| `@dynamic-field-kit/angular` | Angular components and module (standalone + NgModule)        |
| `@dynamic-field-kit/vue`     | Vue 3 components and module                                  |

---

## 📥 Installation

**For React:**

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/react
```

**For Angular:**

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/angular
```

**For Vue:**

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/vue
```

---

## 🧱 Core Concepts

The library **does NOT define field types** like:

```ts
'text' | 'number';
```

Instead, it exposes an **extendable interface** that applications can augment:

```ts
export interface FieldTypeMap {}
```

This allows:

- Unlimited custom field types
- Strong typing without locking consumers
- No need to rebuild the library

This pattern is used by mature libraries like **MUI, React Hook Form,** and **Redux Toolkit**.

## 🧩 Defining Field Types (App Side)

Create a `.d.ts` file in your app (e.g. src/types/dynamic-field.d.ts):

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

⚠️ Make sure this file is included in tsconfig.json.

---

## FieldRendererProps

```ts
export interface FieldRendererProps<T = any> {
  value?: T;
  onValueChange?: (value: T) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Record<string, unknown>[];
  className?: string;
  description?: unknown;
}
```

👉 A common contract for all field renderers

**How a renderer reports a new value (per framework)**

The value/props flow in is the same everywhere, but each adapter emits changes
using its framework's native idiom. Write your renderer to the row for your
framework:

| Framework | How the renderer emits a change                             | Notes                                   |
| --------- | ----------------------------------------------------------- | --------------------------------------- |
| React     | Call the `onValueChange(value)` prop                        | Matches `FieldRendererProps` directly   |
| Angular   | `@Output() valueChange` (or `onValueChange`) `EventEmitter` | The adapter subscribes to either output |
| Vue       | `emit('update:value', value)`                               | The standard `v-model` update event     |

All three receive the same inbound props (`value`, `label`, `disabled`,
anything from `FieldDescription.props`, ...).

---

### FieldDescription

A `FieldDescription` defines **what a field is**, not **how it looks**.

```ts
import { FieldDescription } from '@dynamic-field-kit/core';

const fields: FieldDescription[] = [
  {
    name: 'username',
    type: 'text',
    label: 'Username',
  },
  {
    name: 'age',
    type: 'number',
    label: 'Age',
    appearCondition: (data) => data.username !== '',
  },
  {
    name: 'greeting',
    type: 'text',
    label: 'Greeting',
    computeValue: (data) => `Hello ${data.username || ''}`.trim(),
  },
];
```

**Common Properties**
| Property | Description |
|------|------------|
| name | Field key in form data |
| type | Field renderer key |
| label | UI label |
| value | Default value |
| disabled | Forwarded to the renderer as `disabled` |
| props | Extra, framework-agnostic props forwarded verbatim to the renderer (e.g. `acceptFile`, `maxLength`) - keeps domain-specific inputs out of the adapter layer |
| appearCondition | Runtime visibility condition. Called as `(data, rootData)`: `data` is this field's own level (the group item, inside a repeatable group), `rootData` is always the top-level form data |
| computeValue | Derives this field's value from the rest of the form data (e.g. a total or full name) whenever any field changes. Called as `(data, rootData)` like `appearCondition`. Evaluated once per change, not to a fixed point, so avoid chaining `computeValue` fields into a cycle, and return a primitive or a stable reference (a fresh object/array each call defeats render-skipping). |

**Repeatable Field Groups**

A field with `fields` becomes a repeatable group instead of a registry-rendered leaf field: `data[name]` becomes an array of items, each shaped by the nested `fields`. `MultiFieldInput` renders one nested form per item plus "Add"/"Remove" controls - no library-level wiring needed.

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

| Property               | Description                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fields                 | Sub-fields rendered per item. Presence of `fields` is what marks this as a group.                                                                                                                 |
| defaultItem            | Values a newly-added item starts with. Defaults to `{}`.                                                                                                                                          |
| keyField               | Property on each item to use as its stable list key (React key / Vue key / Angular trackBy). Falls back to the array index, which is unsafe if items can be reordered or removed from the middle. |
| minItems / maxItems    | Bounds enforced on the "Remove" / "Add" controls. Unbounded when omitted.                                                                                                                         |
| addLabel / removeLabel | Custom button text (defaults to "Add" / "Remove").                                                                                                                                                |

**Validation & conditions**

Fields can declare an app-supplied `validate` hook plus dynamic
`disabledCondition` / `readOnlyCondition`. The library ships no rule logic and
holds no form state: it runs your functions and surfaces the result. _When_ to
display an error is the renderer's/app's decision.

| Property          | Description                                                                       |
| ----------------- | --------------------------------------------------------------------------------- |
| validate          | `(value, data, rootData?) => string \| string[] \| undefined`. Falsy means valid. |
| disabledCondition | `(data, rootData?) => boolean`. OR-ed with the static `disabled` flag.            |
| readOnlyCondition | `(data, rootData?) => boolean`.                                                   |

`MultiFieldInput` passes each field's current `error` and effective
`disabled`/`readOnly` to its renderer (via `FieldRendererProps`), and emits an
`onValidityChange` (`validityChange` in Angular) event with `{ valid, errors }`
on every change. Disabled and hidden (`appearCondition`) fields are skipped -
they never produce errors. For submit-time validation of a whole form (including
group items) call the exported pure function:

```ts
import { validateFields } from '@dynamic-field-kit/core';

const { valid, errors } = validateFields(fields, data);
// errors: { "email": ["Invalid"], "contacts[1].email": ["Required"] }
```

**Field Registry (Render Layer)**

The library does **not** ship UI components. Instead, applications register their own renderers using the `fieldRegistry` from the framework adapter (`@dynamic-field-kit/react`, `@dynamic-field-kit/angular`, etc.).

```ts
import { fieldRegistry } from '@dynamic-field-kit/react'; // or /angular

fieldRegistry.register('text', myTextRenderer);
fieldRegistry.register('checkbox', myCheckboxRenderer);
```

The registry also exposes `has(type)`, `unregister(type)`, and `list()` for
introspection and teardown.

**Scoped Registries**

`fieldRegistry` is a process-wide singleton, which is convenient but means every
form shares one set of renderers. To give part of an app its own renderers (e.g.
two design systems side by side), create an isolated `FieldRegistry` and provide
it with your framework's native mechanism - existing code that never provides one
keeps using the global singleton:

```tsx
// React
import { FieldRegistry, FieldRegistryProvider } from '@dynamic-field-kit/react';
const registry = new FieldRegistry();
registry.register('text', myTextRenderer);

<FieldRegistryProvider registry={registry}>
  <MultiFieldInput fieldDescriptions={fields} />
</FieldRegistryProvider>;
```

```ts
// Vue: provideFieldRegistry(registry) in a parent's setup()
// Angular: { provide: FIELD_REGISTRY, useValue: registry } in a component/route
```

---

## 📖 Framework-Specific Usage

For detailed setup and component API:

- **React**: See [`packages/react/README.md`](packages/react/README.md)
- **Angular**: See [`packages/angular/README.md`](packages/angular/README.md)
- **Vue**: See [`packages/vue/README.md`](packages/vue/README.md)
- **Core concepts**: See [`packages/core/README.md`](packages/core/README.md)

---

## ➕ Adding a New Field Type

You **do not** need to modify the library. Just extend `FieldTypeMap` in your application:

```ts
declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    date: Date;
    myCustom: any;
  }
}
```

Then register renderers using the framework-specific adapter:

- React: `import { fieldRegistry } from "@dynamic-field-kit/react"`
- Angular: `import { fieldRegistry } from "@dynamic-field-kit/angular"`
- Vue: `import { fieldRegistry } from "@dynamic-field-kit/vue"`

Now your custom types are fully type-safe throughout the codebase.

---

## 🧠 Domain Typing (Optional)

The library intentionally avoids enforcing domain types. If you want strict typing, cast inside your app:

```ts
interface UserForm {
  age: number;
}

const fields: FieldDescription[] = [
  {
    name: 'age',
    type: 'number',
    appearCondition: (data) => (data as UserForm).age > 18,
  },
];
```

This keeps the library generic while allowing strict typing in the app.

---

## 🏗 Architecture

The monorepo contains framework-agnostic core and framework-specific adapters:

```
dynamic-field-kit (monorepo)
├─ packages/
│  ├─ core        # Framework-agnostic types and registry
│  ├─ react       # React components & DynamicInput
│  ├─ angular     # Angular components & DynamicFieldKitModule
│  └─ vue         # Vue 3 components
├─ example/       # Demo apps and integration guides
└─ .github/       # Copilot AI agent instructions
```

All packages share the same `fieldRegistry` instance, so registrations are visible across frameworks (in the same process).

---

## 🚫 Non-Goals

This library intentionally does not include:

- Built-in UI components (bring your own renderers)
- Form state management
- Validation logic

It is a **form engine**, not a full form framework.

## 📄 License

MIT © [vannt-dev](https://github.com/vannt-dev)

## 🤝 Contributing

Contributions welcome! Please see individual package READMEs for setup and development instructions.
