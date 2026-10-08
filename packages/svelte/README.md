# @dynamic-field-kit/svelte

Svelte 5 adapter for `@dynamic-field-kit/core`.

Requires **Svelte 5** (`peerDependencies: svelte ^5.0.0`): the components are
written with runes and snippets. The package's own tests pass on 5.0.0 and on
the newest 5.x.

This package provides Svelte components that render `FieldDescription[]` and
resolve field renderers through the shared registry used by
`dynamic-field-kit`.

## Install

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/svelte svelte
```

Note: `@dynamic-field-kit/core` and `svelte` are **peer dependencies** — this
adapter does not bundle or auto-install them, so add them to your app
explicitly (as shown above). Keep a single `@dynamic-field-kit/core` version
across all adapters so they share one registry.

The package ships its components as `.svelte` source, the way Svelte libraries
do, so it needs a build that compiles Svelte: SvelteKit, or Vite with
`@sveltejs/vite-plugin-svelte`. It is ESM only.

## Exports

- `DynamicInput`
- `FieldInput`
- `MultiFieldInput`
- `createDynamicForm`
- `layoutRegistry` / `LayoutRegistry`
- `fieldRegistry`
- `FieldRegistry` (class, for scoped registries)
- `provideFieldRegistry` / `useFieldRegistry` / `FieldRegistryKey`
- `defaultRenderersMap` / `getDefaultRenderer`
- Types: `FieldDescription`, `FieldTypeKey`, `FieldTypeMap`,
  `FieldRendererProps`, `FieldRenderer`, `Properties`, `LayoutConfig`,
  `LayoutProps`, `LayoutRenderer`, `DynamicForm`, `DynamicFormBinding`,
  `CreateDynamicFormOptions`

Re-exported from `@dynamic-field-kit/core` so a consumer app rarely has to
import both packages:

- `validateField` / `validateFieldAsync` — one field, returns `string[]`
- `validateFields` / `validateFieldsAsync` — a whole schema, returns `ValidationResult`
- `collectFieldPaths` — the leaf paths a schema actually has in the data (`contacts[0].email`)
- `indexGroupPathMap` — index an error or touched map by repeatable-group item
- `buildFieldRendererProps`, `makeFieldId`, `makeErrorId`, `FIELD_RENDERER_PROP_KEYS`
- `resolveDisabled` / `resolveReadOnly` / `resolveOptions`
- `validators` — the built-in validator helpers (`required`, `email`, `minLength`, `compose`, …)
- `ValidationResult` / `ValidationContext`

Everything else in core (the wizard, drafts, undo history, JSON Schema import
and export) is framework-agnostic: import it from `@dynamic-field-kit/core`.

## Register field renderers

A renderer is a Svelte component. It receives core's `FieldRendererProps` and
reports a new value by calling `onValueChange`:

```svelte
<!-- TextField.svelte -->
<script lang="ts">
  import type { FieldRendererProps } from '@dynamic-field-kit/svelte';

  let {
    value,
    onValueChange,
    onBlur,
    label,
    error,
    id,
    className,
  }: FieldRendererProps = $props();
</script>

<label for={id}>{label}</label>
<input
  {id}
  class={className}
  value={(value as string | undefined) ?? ''}
  oninput={(event) => onValueChange?.(event.currentTarget.value)}
  onblur={() => onBlur?.()}
/>
{#if error}<p class="error">{Array.isArray(error) ? error[0] : error}</p>{/if}
```

```ts
import { fieldRegistry } from '@dynamic-field-kit/svelte';
import TextField from './TextField.svelte';

fieldRegistry.register('text', TextField);
```

The props carry the contract's own names, so the CSS class arrives as
`className`, not `class`. Anything a field puts under `props` arrives as an
extra prop of that name.

## Basic usage

```svelte
<script lang="ts">
  import {
    MultiFieldInput,
    type FieldDescription,
    type Properties,
  } from '@dynamic-field-kit/svelte';

  const fields: FieldDescription[] = [
    { name: 'name', type: 'text', label: 'Name', required: true },
    { name: 'age', type: 'number', label: 'Age' },
  ];

  let values = $state.raw<Properties>({});
</script>

<MultiFieldInput
  fieldDescriptions={fields}
  properties={values}
  onChange={(next) => (values = next)}
/>
```

`properties` is optional: without it the component keeps the values itself and
reports each change through `onChange`.

## Form state (`createDynamicForm`)

`createDynamicForm` holds what a form needs beyond its values: errors, touched
and dirty state, validation and submit handling. It has the same surface as
`useDynamicForm` in the React and Vue adapters.

```svelte
<script lang="ts">
  import {
    MultiFieldInput,
    createDynamicForm,
    validators,
    type FieldDescription,
  } from '@dynamic-field-kit/svelte';

  const fields: FieldDescription[] = [
    {
      name: 'email',
      type: 'email',
      label: 'Email',
      validate: validators.compose(validators.required(), validators.email()),
    },
  ];

  const form = createDynamicForm({ fields, initialValues: { email: '' } });
</script>

<form onsubmit={form.handleSubmit((data) => save(data))}>
  <MultiFieldInput fieldDescriptions={fields} {form} />
  <button type="submit" disabled={form.isSubmitting}>Save</button>
  {#if form.isDirty}<button type="button" onclick={() => form.reset()}>Undo</button>{/if}
</form>
```

The `form` prop wires `properties`, `onChange`, `onBlurField`, `touched` and
`errors` in one go; a prop passed next to it wins over the one it would derive.

What the form exposes:

- State, read as plain properties: `data`, `errors`, `touched`, `isDirty`,
  `isValid`, `isValidating`, `isValidationComplete`, `validationStatus`,
  `isSubmitting`, `isSubmitted`, `baselineValues`. They are reactive wherever
  Svelte tracks reads (markup, `$derived`, `$effect`). Read them from `form`
  each time: `const { data } = form` takes a snapshot.
- Functions: `handleChange`, `handleBlur`, `setFieldValue`, `setFieldTouched`,
  `touchAll`, `resetTouched`, `getDirtyValues`, `reset`, `validate`,
  `validateAsync`, `handleSubmit`, `destroy`.

Options: `fields`, `initialValues`, `validateOnBlur` (default `true`),
`validateOnChange` (default `false`), `messages` (a catalog for the built-in
validators).

Live validation is synchronous: a validator declared or detected as async is
not run while the user types. `handleSubmit` runs every validator, async ones
included, and `validateAsync()` does so on demand. A form created during
component initialisation cancels its in-flight validation when the component
is destroyed; one created elsewhere is yours to `destroy()`.

## Field ids

Each field renders with the id `${idPrefix}-${name}`. `MultiFieldInput` uses a
prefix unique to the component instance, so two forms with the same field name
do not produce duplicate ids. Pass `idPrefix` to pin it, or set `id` on a
field description to name that field's id outright.

## Default renderers

A field type with no registered renderer falls back to a plain, unstyled HTML
control: `text`, `number`, `password`, `email`, `textarea`, `checkbox`,
`switch`, `select`, `radio`, `range`, `file`, `date`, `time` and
`datetime-local`. Under a default control the first error is shown in a
`<div class="dfk-field-error" role="alert">` whose id is what
`aria-describedby` points at. A registered renderer shows its own errors.

## Layouts

Use a layout name:

```svelte
<MultiFieldInput fieldDescriptions={fields} layout="grid" />
```

Use a layout config object:

```svelte
<MultiFieldInput
  fieldDescriptions={fields}
  layout={{ type: 'grid', columns: 3, gap: 12 }}
/>
```

Use the built-in responsive layout:

```svelte
<MultiFieldInput
  fieldDescriptions={fields}
  layout={{
    type: 'responsive',
    mobile: 'column',
    desktop: { type: 'grid', columns: 2, gap: 12 },
  }}
/>
```

Register a layout of your own. A layout is a component that receives the
rendered fields as its `children` snippet:

```svelte
<!-- TightStack.svelte -->
<script lang="ts">
  import type { LayoutProps } from '@dynamic-field-kit/svelte';

  let { children }: LayoutProps = $props();
</script>

<div style="display: grid; gap: 8px;">{@render children()}</div>
```

```ts
import { layoutRegistry } from '@dynamic-field-kit/svelte';
import TightStack from './TightStack.svelte';

layoutRegistry.register('stack-tight', TightStack);
```

## Validation, conditions and derived fields

`validate`, `appearCondition`, `disabledCondition`, `readOnlyCondition` and
`computeValue` are part of the field description and behave as in every
adapter; see the `@dynamic-field-kit/core` README. `MultiFieldInput` hides a
field whose `appearCondition` fails and fills in `computeValue` fields before
it reports a change. Pass `onValidityChange` to be told whether the whole form
is valid, at mount and after each change.

### Async options

A field whose `options` is a function returning a promise loads them when the
field is shown and again when its `optionsDeps` change. The renderer receives
`optionsStatus` (`loading`, `ready`, `error`), `optionsError`, and
`onOptionsQuery(query)` to fetch again with what the user typed.

## Repeatable field groups

A field with `fields` renders as a list of nested forms with Add and Remove
buttons, bounded by `minItems` and `maxItems`. `defaultItem` seeds a new item,
`keyField` names the property that identifies an item, and `addLabel` /
`removeLabel` replace the button texts. Errors and touched state use paths
such as `lines[0].item`.

## Scoped registries

`fieldRegistry` is a process-wide singleton. To give a component subtree its
own renderers, create a `FieldRegistry` and provide it from a parent
component; descendants without a provider keep using the global one.

```ts
import { FieldRegistry, provideFieldRegistry } from '@dynamic-field-kit/svelte';

// in a parent component's <script>
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

## Not in this adapter yet

- **DevTools.** The React and Vue adapters have a `DynamicFormDevTools` panel;
  this one does not.
- **A live demo and a peer-range check in CI.** The other adapters have an
  example app and a script that runs their packed tarballs under the oldest
  supported framework version. For Svelte the floor was checked by hand
  (the test suite under 5.0.0), not by CI.
- **Mutating `properties` in place.** Hand `MultiFieldInput` a new object when
  the values change, as `createDynamicForm` does; an object that is mutated in
  place after the user has typed is not picked up.

## Notes

- `@dynamic-field-kit/core` owns the schema types and shared runtime registry.
- `DynamicInput` renders `Unknown field type: ...` when a renderer is missing,
  and `MultiFieldInput` renders `Unknown layout: ...` for an unregistered layout.
- Fields with `fields` render as repeatable groups instead of going through
  `fieldRegistry`.

## License

MIT
