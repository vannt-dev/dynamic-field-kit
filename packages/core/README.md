# @dynamic-field-kit/core

Core types and shared registries for `dynamic-field-kit`.

`@dynamic-field-kit/core` is intentionally framework-agnostic. It does not import React, Vue, or Angular types in its public API. Applications define field schemas in `core`, then register framework-specific renderers through an adapter package such as `@dynamic-field-kit/react`, `@dynamic-field-kit/vue`, or `@dynamic-field-kit/angular`.

Live demo: https://vannt-dev.github.io/dynamic-field-kit/ — the same schema
rendered by [React](https://vannt-dev.github.io/dynamic-field-kit/react/),
[Vue](https://vannt-dev.github.io/dynamic-field-kit/vue/) and
[Angular](https://vannt-dev.github.io/dynamic-field-kit/angular/), including the
[wizard engine](https://vannt-dev.github.io/dynamic-field-kit/react/wizard/)
documented below.

## What this package provides

- `FieldDescription` for schema-driven field definitions
- `FieldRendererProps` as the shared renderer contract
- `FieldTypeMap` for module augmentation and custom field typing
- `fieldRegistry` as the shared runtime registry instance, plus the `FieldRegistry` class for isolated (scoped) registries
- Layout config types (`LayoutConfig`, `BaseLayout`, `ResponsiveLayout`, `ColumnLayoutConfig`, `RowLayoutConfig`, `GridLayoutConfig`) - the single source of truth re-exported by every adapter
- `applyComputedValues` to resolve `computeValue` fields against form data
- `validateField` / `validateFieldAsync`, `validateFields` / `validateFieldsAsync`, `resolveDisabled`, `resolveReadOnly`, `resolveOptions` and the `ValidationResult` / `ValidationContext` types for opt-in, app-supplied validation and dynamic disabled/readOnly/options conditions
- `collectFieldPaths` to expand a schema into the leaf paths that exist in the data (`contacts[0].email`), and `indexGroupPathMap` to index an error or touched map by group item
- `isFieldGroup`, `createGroupItem`, `canAddGroupItem`, `canRemoveGroupItem` to work with repeatable field groups (`FieldDescription.fields`), plus `moveGroupItem`, `swapGroupItems`, `insertGroupItem` and `focusFirstInvalidField` for driving a group's array yourself
- `zodValidator`, `yupValidator`, `valibotValidator` / `standardSchemaValidator` to validate with an existing schema library
- A multi-step wizard state machine: `createWizardState`, `validateStep`, `canGoNext` / `canGoPrev`, `goNext` / `goPrev` / `goToStep`, `markStepCompleted` / `isStepCompleted`

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
  onBlur?: () => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  touched?: boolean;
  dirty?: boolean;
  error?: string | string[];
  options?: Record<string, any>[];
  optionsStatus?: 'idle' | 'loading' | 'ready' | 'error';
  optionsError?: unknown;
  /** Not in FIELD_RENDERER_PROP_KEYS - a callback, like onValueChange. */
  onOptionsQuery?: (query: string) => void;
  className?: string;
  description?: any;
  id?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  ariaRequired?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  accept?: string;
  multiple?: boolean;
}
```

Each adapter feeds a renderer the same inbound props but reports changes with its
framework's native idiom: React calls the `onValueChange` prop, Angular emits a
`valueChange` (or `onValueChange`) `EventEmitter`, and Vue emits `update:value`.

### The contract is enforced, not merely declared

Every prop above reaches the renderer on **all three adapters**. That is not a
convention — the list lives in core as `FIELD_RENDERER_PROP_KEYS`, the bag is
built once by `buildFieldRendererProps`, every adapter calls it, and
`scripts/check-renderer-prop-parity.js` fails the build if one of them stops
carrying a key across its own component boundary. Before 1.6 each adapter
hand-wrote its own list and they drifted: React silently dropped `placeholder`,
`min`, `max`, `step`, `accept` and `multiple`; Vue dropped `required`, `id`,
`dirty` and the aria flags; Angular dropped `touched`, `dirty` and `id`. A
renderer written for one framework could not be ported to another, which is the
opposite of the point.

One deliberate deviation remains, and it is a framework constraint rather than
drift: **Vue delivers `className` as `class`**. Forwarding `className` too would
let it fall through to a renderer's root element, where Vue assigns
`el.className` — an undefined value becomes `''` and wipes whatever class the
renderer set on itself.

`ariaDescribedBy` used to be the one prop no adapter filled in — it was
hard-coded `undefined`, on the reasoning that pointing `aria-describedby` at an
id that might not exist was worse than leaving it unset. That reasoning held,
but it made `focusFirstInvalidField` (which selects `[aria-invalid="true"]`)
silently do nothing for every consumer following the renderer recipe, since the
recipe never mentioned forwarding the aria props either.

Since 1.7.0 it is `makeErrorId(id)` — `` `${id}-error` `` — whenever the field
has an error, and `undefined` while it is valid. The default renderers render a
node carrying that id, so the reference resolves for them. A custom renderer
that forwards `aria-describedby` must put `makeErrorId(id)` on whatever element
shows its message, or the reference dangles again.

```ts
import { buildFieldRendererProps, makeFieldId } from '@dynamic-field-kit/core';

// What every adapter's FieldInput does. Resolves disabled/readOnly/options,
// validates (skipping disabled fields), and sets the aria flags.
const props = buildFieldRendererProps({
  fieldDescription: field,
  data, // this field's own level
  rootData, // the top-level form
  id: makeFieldId(field, idPrefix),
  touched,
  dirty,
});
```

`makeFieldId(field, prefix)` returns `field.id` when set, else
`` `${prefix}-${field.name}` ``. Adapters pass a prefix unique to each
`MultiFieldInput` instance, so two forms holding a field of the same name no
longer emit duplicate DOM ids.

```ts
export interface FieldDescription<T extends FieldTypeKey = FieldTypeKey> {
  name: string;
  type: T;
  // Pins this field's DOM id. Otherwise the id is the owning MultiFieldInput's
  // instance prefix plus `name`.
  id?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  // `rootData` is the top-level form data; `data` is this field's own level
  // (the group item when nested in a repeatable group).
  appearCondition?: (
    data: Record<string, any>,
    rootData?: Record<string, any>,
  ) => boolean;
  computeValue?: (
    data: Record<string, any>,
    rootData?: Record<string, any>,
  ) => unknown;
  options?: Record<string, any>[];
  className?: string;
  description?: any;
  // Extra props forwarded verbatim to the renderer (e.g. acceptFile, maxLength).
  props?: Record<string, any>;
  // Repeatable field group (see "Repeatable field groups" below)
  fields?: FieldDescription[];
  defaultItem?: Record<string, any>;
  // Item property used as the stable list key; falls back to the array index.
  keyField?: string;
  minItems?: number;
  maxItems?: number;
  addLabel?: string;
  removeLabel?: string;
}
```

The value types that show up throughout that shape, and in every signature in
this README:

```ts
// Any form-data object. `data` and `rootData` are always this.
export type Properties = Record<string, unknown>;

// What `validators.*` helpers return: one message, or undefined when valid.
export type ValidatorFn = (
  value: unknown,
  data?: Properties,
  rootData?: Properties,
) => string | undefined;

// What a `FieldDescription.validate` hook may return. The Promise arm is what
// makes a field async-only -- see "Sync vs async validation" below.
export type FieldValidatorResult =
  string | string[] | undefined | Promise<string | string[] | undefined>;

export type FieldValidatorFunction = (
  value: unknown,
  data: Properties,
  rootData?: Properties,
) => FieldValidatorResult;
```

The schema adapters (`zodValidator` and friends) each return a
`FieldValidatorFunction`, which is why their result drops straight into
`validate`.

## Derived fields with `computeValue`

`computeValue` derives a field's value from the rest of the form data (e.g. a `fullName` computed from `firstName` + `lastName`). It is called as `(data, rootData)` - `rootData` is the top-level form even for fields nested in a group. Every adapter's `MultiFieldInput` re-evaluates it once per change, against the post-change data - it is not re-run to a fixed point, so avoid chaining `computeValue` fields into a cycle, and return a primitive or a stable reference (returning a fresh object/array each call defeats the render-skipping optimisation). In development, `applyComputedValues` warns when a `computeValue` chain does not converge in one pass.

```ts
import { applyComputedValues } from '@dynamic-field-kit/core';

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

applyComputedValues(fields, { firstName: 'Ada', lastName: 'Lovelace' });
// => { firstName: 'Ada', lastName: 'Lovelace', fullName: 'Ada Lovelace' }
```

Adapters call `applyComputedValues` for you whenever `MultiFieldInput`'s data changes; you normally only need to import it directly when working with form data outside of a component (e.g. on submit).

## Validation & conditions

`validate`, `disabledCondition`, and `readOnlyCondition` are app-supplied hooks
on `FieldDescription`. `@dynamic-field-kit/core` includes a set of built-in helper validators
as well as async validation functions (`validateFieldsAsync`).

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
      validators.email('Must be a valid email address'),
    ),
    readOnlyCondition: (data, rootData) => (rootData ?? data).frozen === true,
  },
  {
    name: 'username',
    type: 'text',
    // Async validation (e.g. checking availability via API)
    validate: async (value) => {
      if (!value) return 'Username required';
      const available = await checkUsername(String(value));
      return available ? undefined : 'Username already taken';
    },
  },
  {
    name: 'city',
    type: 'select',
    // Dynamic options callback dependent on current form data
    options: (data) =>
      data.country === 'VN' ? ['Hanoi', 'HCM'] : ['NY', 'LA'],
    disabledCondition: (data) => !data.country,
  },
];
```

### Built-in Validators Utility (`validators`)

`validators` provides common validation helpers:

- `validators.required(message?)` - Enforces non-empty value
- `validators.email(message?)` - Enforces valid email pattern
- `validators.minLength(min, message?)` - Enforces minimum string/array length
- `validators.maxLength(max, message?)` - Enforces maximum string/array length
- `validators.min(minVal, message?)` - Enforces minimum numeric value
- `validators.max(maxVal, message?)` - Enforces maximum numeric value
- `validators.pattern(regex, message?)` - Enforces regex pattern match
- `validators.matches(otherFieldName, message?)` - Enforces equality with
  another field, for confirm-password / confirm-email. Skips empty values so
  `required` owns that message, and compares with `Object.is` so two `NaN`s match
- `validators.compose(...fns)` - Combines multiple validator functions into one

`validateFields(fields, data, rootData?, context?)` returns `{ valid, errors,
complete, status }`, recursing into repeatable groups (keys like `contacts[0].email`) and
skipping fields that are hidden by `appearCondition` or disabled. Adapters call `validateField` /
`resolveDisabled` / `resolveReadOnly` / `resolveOptions` per field to surface
`error`, `disabled`, `readOnly` and the resolved `options` to renderers
reactively.

### Validation messages

Built-in validators resolve their message when they **run**, not when the field
description is built, so a catalog set once for a form reaches all of them:

```ts
import {
  createMessageResolver,
  setDefaultMessages,
} from '@dynamic-field-kit/core';

// Per form, through an adapter:
useDynamicForm({ fields, messages: { required: 'Bắt buộc' } });

// Or process-wide, for direct validateFields callers:
setDefaultMessages({ required: 'Bắt buộc' });

// Or built by hand and passed as the validation context:
validateFields(fields, data, undefined, {
  t: createMessageResolver({ required: 'Bắt buộc' }),
});
```

Precedence is: a message passed straight to the validator, then the form's
catalog, then the process-wide one, then the validator's English default.

| Key         | Params    | English default         |
| ----------- | --------- | ----------------------- |
| `required`  | —         | Field is required       |
| `email`     | —         | Invalid email address   |
| `minLength` | `{min}`   | Minimum length is {min} |
| `maxLength` | `{max}`   | Maximum length is {max} |
| `min`       | `{min}`   | Minimum value is {min}  |
| `max`       | `{max}`   | Maximum value is {max}  |
| `pattern`   | —         | Invalid format          |
| `matches`   | `{other}` | Must match {other}      |

**No locale bundles ship with this package.** Supply your own catalog. A
placeholder with no matching param is left verbatim rather than replaced with
`undefined`, so a typo surfaces as a visible `{unit}`.

`ValidationContext` — already `validate`'s fourth argument, carrying `signal` —
gains an optional `t`, so a hand-written validator can translate its own
messages the same way.

### Async options

`options` takes a static array, a synchronous `(data, rootData) => Options[]`,
or a loader returning a promise. It is one signature, not a union: a union of
two function types defeats TypeScript's contextual inference, which would make
every existing `options: (data) => …` an implicit-`any` error.

```ts
{
  name: 'city',
  type: 'select',
  options: async (data, _rootData, ctx) =>
    fetch(`/api/cities?country=${data.country}`, { signal: ctx?.signal })
      .then((r) => r.json()),
  optionsDeps: (data) => [data.country],
  debounceMs: 200,
}
```

| Property      | Effect                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------ |
| `optionsDeps` | Values a reload depends on, compared shallowly with `Object.is`. Default `[]` — fetch once |
| `optionsMode` | `'async'` for a loader returning a promise without the `async` keyword                     |
| `debounceMs`  | Collapses rapid reloads into one fetch. Async options only                                 |

Renderers receive `optionsStatus` (`'idle' | 'loading' | 'ready' | 'error'`),
`optionsError`, and `onOptionsQuery(query)` for search-remote fields whose query
the form data never sees.

`createOptionsLoader(field, onChange)` is the framework-agnostic engine the
adapters wrap: it debounces, aborts a superseded request through `ctx.signal`,
and discards a response that lands out of order, so the list always reflects the
newest request rather than the last to arrive.

Native `async` functions are detected automatically. A loader wrapped in a
memoiser, a spy or a transpiler helper is **not** — `constructor.name` stops
being `'AsyncFunction'`. Declare `optionsMode: 'async'` for those; without it the
promise is dropped and a development warning says so, rather than the renderer
receiving a pending promise as its option list.

### Reading a ValidationResult

```ts
interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
  /** Fields whose validator could not run synchronously. Omitted when empty. */
  pending?: string[];
  /** True only when every applicable validator finished in this pass. */
  complete: boolean;
  status: 'valid' | 'invalid' | 'pending';
}
```

Read `status`. `valid` on its own cannot tell "nothing is wrong" from "nothing
is wrong yet": a form whose only remaining rule is a remote uniqueness check
reports `valid: true` while that check has not run, which reads as a green
light. `status` is `'pending'` exactly when something is still unanswered, and
`complete` says whether every applicable validator finished.

### Sync vs async validation

`validateField` and `validateFields` are synchronous. An async validator is
never invoked on that path - it is listed in `result.pending` instead, and the
result comes back `status: 'pending'`. Async validators must go through the
async pair for a final answer:

```ts
import {
  validateField,
  validateFieldAsync,
  validateFields,
  validateFieldsAsync,
} from '@dynamic-field-kit/core';

// One field. Both always return string[] (empty when valid).
const errors = validateField(field, value, data, rootData); // string[]
const errorsAsync = await validateFieldAsync(field, value, data, rootData);

// A whole schema. The sync result may also include `pending` field names.
const result = validateFields(fields, data); // sync hooks only
const resultAsync = await validateFieldsAsync(fields, data); // awaits each hook
```

`validateFieldsAsync` starts independent validators in parallel rather than
awaiting them one after another, so a form with several remote rules costs the
slowest one, not their sum.

The framework form helpers keep live validation synchronous, but their submit
handlers automatically run an async-capable validation pass. They also
expose `validateAsync()` for checks that must finish before submit.

#### Declaring an async validator

Detection covers a native `async` function. A function that returns a Promise
without the `async` keyword is indistinguishable from a sync one until it has
been called, so declare it:

```ts
const field: FieldDescription = {
  name: 'username',
  type: 'text',
  validationMode: 'async',
  validate: (value) => checkAvailability(value), // returns a Promise
};
```

With `validationMode: 'async'` the sync pass never invokes the validator - no
wasted request per keystroke - and the dev-mode warning about a field live
validation cannot check stays quiet, because you have said you know.

#### Cancelling a run

`validateFieldsAsync(fields, data, rootData?, options?)` takes a
`ValidationContext` and hands its `AbortSignal` to every validator as a fourth
argument:

```ts
const controller = new AbortController();
const result = await validateFieldsAsync(fields, data, data, {
  signal: controller.signal,
});

const field: FieldDescription = {
  name: 'username',
  type: 'text',
  validationMode: 'async',
  validate: (value, _data, _rootData, context) =>
    fetch(`/api/available?u=${value}`, { signal: context?.signal }).then((r) =>
      r.ok ? undefined : 'Already taken',
    ),
};
```

Once the signal aborts, remaining validators are skipped and the result comes
back `complete: false` / `status: 'pending'` - a partial answer, never a false
"valid". A validator that honours the signal by rejecting with an `AbortError`
is treated the same way, so an aborted run does not reject the caller. Any
other error still propagates.

The framework form helpers create and abort these controllers for you: typing
cancels the live validation run in flight so a stale result cannot overwrite a
newer one.

`resolveOptions(field, data, rootData?)` returns `Properties[] | undefined`,
calling `field.options` when it is a callback and passing it through when it is a
static array.

### Schema adapters (Zod, Yup, Valibot / Standard Schema)

Attach a schema to a field's `validate` hook. By default the schema is treated
as an **object schema describing the whole form**, and a field name selects
which issues to surface:

```ts
import {
  zodValidator,
  yupValidator,
  valibotValidator,
} from '@dynamic-field-kit/core';

const schema = z.object({ email: z.string().email() });

const fields: FieldDescription[] = [
  { name: 'email', type: 'text', validate: zodValidator(schema, 'email') },
];
```

For a **scalar schema** covering a single value, say so explicitly:

```ts
validate: zodValidator(z.string().email(), { target: 'field' });
```

Both accept `SchemaValidatorOptions` — `{ field?: string; target?: 'form' | 'field' }`.
`valibotValidator` is an alias of `standardSchemaValidator`, which handles any
Standard Schema object (including Zod's `~standard`).

Adapters parse **synchronously**, so the result works with the synchronous
`validateFields` (and therefore with the framework form hooks). A schema with
async refinements or async `.test()` rules cannot be parsed synchronously —
those return a Promise, so validate through `validateFieldsAsync`.

## Multi-step wizard

A framework-agnostic state machine over grouped fields. State is immutable:
every navigation returns a new object.

```ts
import {
  createWizardState,
  validateStep,
  goNext,
  goPrev,
  isStepCompleted,
} from '@dynamic-field-kit/core';

let wizard = createWizardState([
  { id: 'account', title: 'Account', fields: accountFields },
  { id: 'profile', title: 'Profile', fields: profileFields },
]);

const { valid, errors } = validateStep(wizard.currentStep, data);
if (valid) {
  wizard = goNext(wizard); // records the step it leaves in completedSteps
}
```

| Export                             | Description                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `createWizardState(steps, index?)` | Initial state; `index` is clamped into range                                        |
| `validateStep(step, data)`         | `{ valid, errors }` for one step's fields                                           |
| `canGoNext` / `canGoPrev`          | Whether a move is possible                                                          |
| `goNext` / `goPrev`                | Move one step; returns the **same object** when it cannot, so `===` detects a no-op |
| `goToStep(state, index)`           | Jump anywhere (clamped); does not mark anything completed                           |
| `markStepCompleted(state, index?)` | Record a step as done, defaulting to the current one                                |
| `isStepCompleted(state, index)`    | For rendering a step indicator                                                      |

Each step is a `FormStep`, and `WizardState` is what every helper above takes
and returns:

```ts
export interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: FieldDescription[];
}

export interface WizardState {
  currentStepIndex: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  currentStep: FormStep;
  steps: FormStep[];
  completedSteps: number[];
}
```

`goNext` does not validate — call `validateStep` yourself so a "save draft and
come back" flow stays possible.

## Group array helpers

Every adapter's `MultiFieldInput` renders add/remove controls itself. These
helpers are for driving a group's array yourself — a drag handle, a "duplicate
row" button, a custom group renderer. All are pure and never mutate the input:

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

const reordered = moveGroupItem(items, 3, 0); // same array back if out of range
const withRow = insertGroupItem(items, 1, createGroupItem(field));

if (canAddGroupItem(field, items)) {
  /* respects maxItems */
}

// After a failed submit: focus + scroll to the first [aria-invalid="true"] field
focusFirstInvalidField(formElement);
```

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

Set `keyField` to an item property (e.g. an `id`) so each item keeps a stable list identity; without it the array index is used, which reassociates item state when an item is reordered or removed from the middle.

The `isFieldGroup`, `createGroupItem`, `canAddGroupItem`, and `canRemoveGroupItem` helpers back this feature and are exported for adapters (or apps) that need to replicate the same add/remove bounds logic outside of `MultiFieldInput`.

## Scoped registries

`fieldRegistry` is a process-wide singleton shared by every adapter. To give part of an app its own renderers, construct an isolated `FieldRegistry` and provide it with your framework's mechanism (React `FieldRegistryProvider`, Vue `provideFieldRegistry`, Angular `FIELD_REGISTRY` token). Code that never provides one keeps using the global singleton.

```ts
import { FieldRegistry } from '@dynamic-field-kit/core';

const registry = new FieldRegistry();
registry.register('text', myRenderer);

registry.has('text'); // true
registry.list(); // ['text']
registry.unregister('text'); // true
```

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
  }),
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
