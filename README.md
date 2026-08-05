# Dynamic Field Kit

[![CI](https://github.com/vannt-dev/dynamic-field-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/vannt-dev/dynamic-field-kit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@dynamic-field-kit/core?label=core)](https://www.npmjs.com/package/@dynamic-field-kit/core)
[![npm](https://img.shields.io/npm/v/@dynamic-field-kit/react?label=react)](https://www.npmjs.com/package/@dynamic-field-kit/react)
[![npm](https://img.shields.io/npm/v/@dynamic-field-kit/vue?label=vue)](https://www.npmjs.com/package/@dynamic-field-kit/vue)
[![npm](https://img.shields.io/npm/v/@dynamic-field-kit/angular?label=angular)](https://www.npmjs.com/package/@dynamic-field-kit/angular)

**[▶ Live demos](https://vannt-dev.github.io/dynamic-field-kit/)** — the same
schema rendered by [React](https://vannt-dev.github.io/dynamic-field-kit/react/),
[Vue](https://vannt-dev.github.io/dynamic-field-kit/vue/) and
[Angular](https://vannt-dev.github.io/dynamic-field-kit/angular/), including a
[multi-step wizard](https://vannt-dev.github.io/dynamic-field-kit/react/wizard/).

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

### 🚀 Enterprise Features (v1.4+)

- **Form State Hook / Composable / Signal Store**: `useDynamicForm` for React & Vue 3, `createDynamicFormStore` for Angular Signals. All three expose the same surface — including `isSubmitting` / `isSubmitted` — and `handleSubmit(onValid, onInvalid)` returns a submit handler in every framework.
- **Extended HTML5 Renderers**: Built-in support for `radio`, `range`, `file`, `date`, `time`, `datetime-local`, and `switch`.
- **Schema Validation Adapters**: Integrated `zodValidator`, `yupValidator`, `valibotValidator`, and Standard Schema adapters.
- **Multi-Step Form Wizard Engine**: `createWizardState`, `validateStep`, `canGoNext`, `canGoPrev`, `goNext`, `goPrev`, `goToStep`, `markStepCompleted`, `isStepCompleted`. State is immutable — every navigation returns a new state, and `goNext` records the step it leaves in `completedSteps`.
- **Interactive Form DevTools**: Floating overlay component (`<DynamicFormDevTools />`) for realtime debugging.
- **Blur wiring**: `MultiFieldInput` reports blur via `onBlurField` (an `@Output` in Angular), so a form store's `handleBlur` / `touched` / `validateOnBlur` can be connected to it.
- **Group Array Manipulation Helpers**: `moveGroupItem`, `swapGroupItems`, `insertGroupItem`, and `focusFirstInvalidField`.

#### Schema adapters

Attach an adapter to a field's `validate` hook. By default the schema is treated
as an **object schema describing the whole form**, and a field name selects which
issues to surface:

```ts
import { zodValidator } from '@dynamic-field-kit/core';

const schema = z.object({ email: z.string().email() });

const fields = [
  { name: 'email', type: 'text', validate: zodValidator(schema, 'email') },
];
```

For a **scalar schema** covering a single value, say so explicitly:

```ts
validate: zodValidator(z.string().email(), { target: 'field' });
```

Adapters parse **synchronously** so their result works with `validateFields` (and
therefore with `useDynamicForm`). A schema containing async refinements or async
`.test()` rules cannot be parsed synchronously — those return a Promise, so
validate through `validateFieldsAsync` instead.

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

> **`@dynamic-field-kit/core` is a peer dependency of every adapter** (as is your framework: `react` + `react-dom`, `vue`, or `@angular/*`). Install it explicitly, as shown above — the adapters no longer pull it in automatically. Keeping a single shared `core` version means all adapters resolve the same field registry.

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

Fields can declare an app-supplied `validate` hook, built-in helper `validators`, async validation, plus dynamic
`disabledCondition` / `readOnlyCondition` and dynamic `options`.

```ts
import {
  validators,
  validateFields,
  validateFieldsAsync,
} from '@dynamic-field-kit/core';

const fields: FieldDescription[] = [
  {
    name: 'email',
    type: 'text',
    // Built-in composed validator
    validate: validators.compose(
      validators.required('Email is required'),
      validators.email('Invalid email')
    ),
  },
  {
    name: 'city',
    type: 'select',
    // Dynamic options callback evaluated on form data change
    options: (data) =>
      data.country === 'VN' ? ['Hà Nội', 'HCM'] : ['NY', 'LA'],
    disabledCondition: (data) => !data.country,
  },
];
```

| Property          | Description                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| validate          | `(value, data, rootData?) => string \| string[] \| undefined \| Promise<...>`. Falsy means valid.   |
| validators        | Built-in helpers: `required`, `email`, `minLength`, `maxLength`, `min`, `max`, `pattern`, `compose` |
| options           | Array of option objects or dynamic callback function `(data, rootData?) => Option[]`                |
| disabledCondition | `(data, rootData?) => boolean`. OR-ed with the static `disabled` flag.                              |
| readOnlyCondition | `(data, rootData?) => boolean`.                                                                     |

`MultiFieldInput` passes each field's current `error` and effective
`disabled`/`readOnly` to its renderer (via `FieldRendererProps`), and emits an
`onValidityChange` (`validityChange` in Angular) event with `{ valid, errors }`
on every change. Disabled and hidden (`appearCondition`) fields are skipped -
they never produce errors. For submit-time or async validation of a whole form (including
group items) call `validateFields` or `validateFieldsAsync`:

```ts
import { validateFields, validateFieldsAsync } from '@dynamic-field-kit/core';

const { valid, errors } = validateFields(fields, data);
// errors: { "email": ["Required"], "contacts[1].email": ["Invalid"] }

// Or for async validation:
const asyncResult = await validateFieldsAsync(fields, data);
```

**Default Built-in HTML5 Renderers (Zero Config)**

All framework adapters (`react`, `vue`, `angular`) ship with **built-in HTML5 fallback renderers**:

`text` · `number` · `password` · `email` · `textarea` · `checkbox` · `select` ·
`radio` · `range` · `file` · `date` · `time` · `datetime-local` · `switch`

If you do not register a custom component for a type, the library automatically renders a clean, accessible HTML5 input with support for labels, placeholders, disabled states, options, and error states.

Every key above is also a `FieldTypeMap` entry, so `type: 'switch'` typechecks
out of the box. The map itself is reachable if you need to wrap or inspect a
default:

```ts
import {
  defaultRenderersMap,
  getDefaultRenderer,
} from '@dynamic-field-kit/react'; // or /vue

const Base = getDefaultRenderer('date'); // undefined for an unknown type
Object.keys(defaultRenderersMap); // every built-in type key
```

`file` emits a `File` (or `File[]` when `multiple` is set), `range` and `number`
emit numbers, `checkbox` / `switch` emit booleans; everything else emits strings.

**Custom Field Registry (Custom UI & Design Systems)**

To use custom UI components (e.g., Tailwind, Ant Design, Shadcn UI), register custom renderers using `fieldRegistry`:

```ts
import { fieldRegistry } from '@dynamic-field-kit/react'; // or /angular /vue

fieldRegistry.register('text', CustomInputComponent);
fieldRegistry.register('select', CustomSelectComponent);
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

## 🧾 Form State (`useDynamicForm`)

Holds the data, errors, touched and submission state for a set of fields. React
and Vue export `useDynamicForm`; Angular exports `createDynamicFormStore`, built
on signals. All three expose the same surface.

```tsx
// React
import { useDynamicForm, MultiFieldInput } from '@dynamic-field-kit/react';

const form = useDynamicForm({
  fields,
  initialValues: { country: 'VN' },
  validateOnBlur: true, // default
  validateOnChange: false, // default
});

<form onSubmit={form.handleSubmit((data) => save(data))}>
  <MultiFieldInput
    fieldDescriptions={fields}
    properties={form.data}
    onChange={form.handleChange}
    onBlurField={form.handleBlur} // wires touched + validateOnBlur
  />
  <button disabled={form.isSubmitting}>
    {form.isSubmitting ? 'Saving…' : 'Save'}
  </button>
</form>;
```

```ts
// Vue — same names, refs instead of plain values
const form = useDynamicForm({ fields });
form.data.value;
form.isSubmitting.value;

// Angular — same names, signals
const store = createDynamicFormStore({ fields });
store.data();
store.isSubmitting();
```

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
| `validate()`                        | Validate now, returns a boolean                                                   |
| `reset(values?)`                    | Back to `initialValues` (or the values given), clearing errors/touched/submission |
| `handleSubmit(onValid, onInvalid?)` | Returns a submit handler; calls `preventDefault`, validates, then dispatches      |

`handleSubmit` returns a **handler** in every framework, so Angular binds it the
same way: `onSubmit = this.store.handleSubmit((data) => …)` then
`(ngSubmit)="onSubmit($event)"`.

## 🧭 Multi-Step Wizard

A framework-agnostic state machine over grouped `FieldDescription`s. State is
immutable — every navigation returns a new state object.

```ts
import {
  createWizardState,
  validateStep,
  goNext,
  goPrev,
  canGoNext,
  isStepCompleted,
} from '@dynamic-field-kit/core';

const steps = [
  { id: 'account', title: 'Account', fields: accountFields },
  { id: 'profile', title: 'Profile', fields: profileFields },
];

let wizard = createWizardState(steps);

function next(data) {
  // goNext does not validate — decide for yourself whether the step may be left
  const { valid, errors } = validateStep(wizard.currentStep, data);
  if (!valid) return errors;
  wizard = goNext(wizard); // records the step it leaves in completedSteps
}
```

| Export                             | Description                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `createWizardState(steps, index?)` | Initial state; `index` is clamped into range                                        |
| `validateStep(step, data)`         | `{ valid, errors }` for one step's fields                                           |
| `canGoNext` / `canGoPrev`          | Whether a move is possible                                                          |
| `goNext` / `goPrev`                | Move one step. Returns the **same object** when it cannot, so `===` detects a no-op |
| `goToStep(state, index)`           | Jump anywhere (clamped). Does not mark anything completed                           |
| `markStepCompleted(state, index?)` | Record a step as done; defaults to the current one                                  |
| `isStepCompleted(state, index)`    | For rendering a step indicator                                                      |

`WizardState` carries `currentStep`, `currentStepIndex`, `totalSteps`,
`isFirstStep`, `isLastStep`, `steps` and `completedSteps`.

## 🛠️ DevTools

A floating overlay showing live form data, errors, metadata and field
descriptions. Render it next to your form during development.

```tsx
import { DynamicFormDevTools } from '@dynamic-field-kit/react'; // or /vue

<DynamicFormDevTools
  data={form.data}
  errors={form.errors}
  touched={form.touched}
  isDirty={form.isDirty}
  fields={fields}
  position="bottom-right" // or "bottom-left"
/>;
```

```html
<!-- Angular: DynamicFormDevToolsComponent -->
<dfk-dev-tools [data]="store.data()" [errors]="store.errors()"></dfk-dev-tools>
```

The collapsed button carries a red badge with the number of fields in error.

## 🧮 Group Array Helpers

`MultiFieldInput` renders add/remove controls for repeatable groups on its own.
These helpers are for driving a group's array yourself — a drag handle, a
"duplicate row" button, a custom group renderer:

```ts
import {
  moveGroupItem,
  swapGroupItems,
  insertGroupItem,
  isFieldGroup,
  createGroupItem,
  canAddGroupItem,
  canRemoveGroupItem,
  focusFirstInvalidField,
} from '@dynamic-field-kit/core';

const reordered = moveGroupItem(items, 3, 0); // returns the SAME array if out of range
const withRow = insertGroupItem(items, 1, createGroupItem(field));

if (canAddGroupItem(field, items)) {
  /* respects maxItems */
}

// After a failed submit: focus + scroll to the first [aria-invalid="true"] field
focusFirstInvalidField(formElement);
```

All of them are pure — they return a new array and never mutate the input.

---

## ▶️ Runnable Examples

`example/` holds a working app per framework. They consume the packages through
`file:` paths, so build the packages first:

```bash
npm run build                     # from the repo root
cd example/react-app && npm install && npm run dev
```

| Page                      | Shows                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `/` (react, vue, angular) | Registering renderers, `MultiFieldInput`, layouts, conditions, repeatable groups                                 |
| `/new-features` (react)   | `useDynamicForm`, the extended HTML5 renderers, blur wiring via `onBlurField`, `DynamicFormDevTools`             |
| `/wizard` (react)         | The wizard engine end to end: step indicator from `completedSteps`, per-step `validateStep`, `goNext` / `goPrev` |

CI builds all three example apps on every PR, so the code above is guaranteed
to compile against the current packages.

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

## 🚀 Releasing

Versions are never edited by hand. Go to **Actions → Release → Run workflow**,
run it on `develop`, and fill in:

| Input      | Meaning                                                                |
| ---------- | ---------------------------------------------------------------------- |
| `bump`     | `patch`, `minor` or `major`                                            |
| `packages` | `core,react,vue,angular` — leave empty to bump all of them             |
| `message`  | The CHANGELOG entry for this release                                   |
| `dry_run`  | Version and print the result without committing, tagging or publishing |

The workflow runs the full quality gates first, then applies the bump, writes
the CHANGELOGs, commits `chore(release): version packages`, and publishes to
npm.

Packages are versioned independently, so bumping only what changed is fine.
Any changesets already committed (`npx changeset`, or
`npm run changeset:auto -- --bump minor --packages core --message "..."`) are
consumed in the same run, and the largest bump per package wins.

Run it on `develop`, not `master`: master requires status checks, and those
apply to direct pushes too, so the Actions bot cannot push the release commit
there. The new versions reach master through the usual `develop → master` PR.

## 📄 License

MIT © [vannt-dev](https://github.com/vannt-dev)

## 🤝 Contributing

Contributions welcome! Please see individual package READMEs for setup and development instructions.
